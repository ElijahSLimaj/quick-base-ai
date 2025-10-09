-- Create ticket_attachments table for file uploads and document sharing
-- Integrates with Supabase Storage for secure file handling

CREATE TABLE public.ticket_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ticket_messages(id) ON DELETE SET NULL, -- Optional: attach to specific message

  -- File information
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL, -- User's original filename
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size INTEGER NOT NULL, -- Size in bytes
  mime_type TEXT NOT NULL,
  file_extension TEXT,

  -- Upload metadata
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT, -- If uploaded by customer
  upload_source TEXT DEFAULT 'dashboard' CHECK (upload_source IN ('dashboard', 'email', 'widget', 'api')),

  -- Access control
  is_public BOOLEAN DEFAULT false, -- Whether customers can access this file
  is_internal BOOLEAN DEFAULT false, -- Internal team files only

  -- File processing status
  scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'error')),
  scan_result TEXT, -- Virus scan results
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Image/document processing
  thumbnail_path TEXT, -- Thumbnail for images
  text_content TEXT, -- Extracted text for searchability
  metadata JSONB DEFAULT '{}', -- Additional file metadata (dimensions, etc.)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional: for temporary files
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_ticket_attachments_updated_at
  BEFORE UPDATE ON public.ticket_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_attachments_updated_at();

-- Function to generate unique file path
CREATE OR REPLACE FUNCTION generate_file_path(
  p_ticket_id UUID,
  p_original_filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  file_ext TEXT;
  unique_id TEXT;
  year_month TEXT;
BEGIN
  -- Extract file extension
  file_ext := lower(substring(p_original_filename from '\.([^.]*)$'));

  -- Generate unique identifier
  unique_id := encode(gen_random_bytes(16), 'hex');

  -- Create year/month folder structure
  year_month := to_char(NOW(), 'YYYY/MM');

  -- Return path: tickets/YYYY/MM/ticket-id/unique-id.ext
  RETURN 'tickets/' || year_month || '/' || p_ticket_id || '/' || unique_id ||
         CASE WHEN file_ext IS NOT NULL THEN '.' || file_ext ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Function to set file metadata on insert
CREATE OR REPLACE FUNCTION set_attachment_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Set file extension if not provided
  IF NEW.file_extension IS NULL THEN
    NEW.file_extension := lower(substring(NEW.original_filename from '\.([^.]*)$'));
  END IF;

  -- Generate file path if not provided
  IF NEW.file_path IS NULL OR NEW.file_path = '' THEN
    NEW.file_path := generate_file_path(NEW.ticket_id, NEW.original_filename);
  END IF;

  -- Set internal flag based on uploader
  IF NEW.uploaded_by IS NOT NULL THEN
    -- Check if uploader is team member
    IF EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.tickets t ON t.organization_id = tm.organization_id
      WHERE t.id = NEW.ticket_id
        AND tm.user_id = NEW.uploaded_by
        AND tm.status = 'active'
    ) THEN
      -- Team member upload - check if it should be internal
      NEW.is_internal := COALESCE(NEW.is_internal, false);
      NEW.is_public := COALESCE(NEW.is_public, true);
    ELSE
      -- Individual website owner or customer upload
      NEW.is_internal := false;
      NEW.is_public := true;
    END IF;
  ELSE
    -- Customer upload
    NEW.is_internal := false;
    NEW.is_public := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set metadata
CREATE TRIGGER set_attachment_metadata_trigger
  BEFORE INSERT ON public.ticket_attachments
  FOR EACH ROW
  EXECUTE FUNCTION set_attachment_metadata();

-- Create indexes for performance
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_message_id ON public.ticket_attachments(message_id);
CREATE INDEX idx_ticket_attachments_uploaded_by ON public.ticket_attachments(uploaded_by);
CREATE INDEX idx_ticket_attachments_created_at ON public.ticket_attachments(created_at);
CREATE INDEX idx_ticket_attachments_mime_type ON public.ticket_attachments(mime_type);
CREATE INDEX idx_ticket_attachments_scan_status ON public.ticket_attachments(scan_status);
CREATE INDEX idx_ticket_attachments_is_internal ON public.ticket_attachments(is_internal);

-- Enable Row Level Security
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_attachments
CREATE POLICY "Users can view attachments for tickets they have access to" ON public.ticket_attachments
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE (
        -- Individual website owners can see attachments for their tickets
        (organization_id IS NULL AND website_id IN (
          SELECT id FROM public.websites WHERE owner_id = auth.uid()
        )) OR
        -- Organization members can see attachments for organization tickets
        (organization_id IS NOT NULL AND (
          -- Organization owner
          auth.uid() IN (
            SELECT owner_id FROM public.organizations WHERE id = organization_id
          ) OR
          -- Team members with view_tickets permission
          auth.uid() IN (
            SELECT user_id FROM public.team_members
            WHERE organization_id = tickets.organization_id
              AND status = 'active'
              AND (permissions->>'view_tickets')::boolean = true
          )
        )) OR
        -- Customers can see attachments for their tickets
        (customer_user_id = auth.uid() OR customer_email = auth.email())
      )
    ) AND (
      -- Team members can see all attachments including internal ones
      uploaded_by IS NOT NULL OR
      -- Customers can only see non-internal, public attachments
      (customer_email = auth.email() AND is_internal = false AND is_public = true)
    )
  );

CREATE POLICY "Authorized users can upload attachments" ON public.ticket_attachments
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE (
        -- Individual website owners can upload attachments for their tickets
        (organization_id IS NULL AND website_id IN (
          SELECT id FROM public.websites WHERE owner_id = auth.uid()
        )) OR
        -- Organization members can upload attachments for organization tickets
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT user_id FROM public.team_members
          WHERE organization_id = tickets.organization_id
            AND status = 'active'
            AND (permissions->>'view_tickets')::boolean = true
        )) OR
        -- Customers can upload attachments for their tickets
        (customer_user_id = auth.uid() OR customer_email = auth.email())
      )
    )
  );

CREATE POLICY "Users can update their own attachments" ON public.ticket_attachments
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    customer_email = auth.email()
  );

CREATE POLICY "Authorized users can delete attachments" ON public.ticket_attachments
  FOR DELETE USING (
    -- Only organization owners and individual website owners can delete attachments
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE (
        (organization_id IS NULL AND website_id IN (
          SELECT id FROM public.websites WHERE owner_id = auth.uid()
        )) OR
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT owner_id FROM public.organizations WHERE id = organization_id
        ))
      )
    ) OR
    -- Users can delete their own attachments
    uploaded_by = auth.uid()
  );

-- Function to get file size in human readable format
CREATE OR REPLACE FUNCTION format_file_size(size_bytes INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF size_bytes < 1024 THEN
    RETURN size_bytes || ' B';
  ELSIF size_bytes < 1024 * 1024 THEN
    RETURN ROUND(size_bytes / 1024.0, 1) || ' KB';
  ELSIF size_bytes < 1024 * 1024 * 1024 THEN
    RETURN ROUND(size_bytes / (1024.0 * 1024.0), 1) || ' MB';
  ELSE
    RETURN ROUND(size_bytes / (1024.0 * 1024.0 * 1024.0), 1) || ' GB';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
  p_mime_type TEXT,
  p_file_size INTEGER,
  p_filename TEXT
)
RETURNS JSONB AS $$
DECLARE
  allowed_types TEXT[] := ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed',
    'application/json'
  ];
  max_size INTEGER := 50 * 1024 * 1024; -- 50MB
  result JSONB;
BEGIN
  result := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);

  -- Check file size
  IF p_file_size > max_size THEN
    result := jsonb_set(result, '{valid}', 'false');
    result := jsonb_set(result, '{errors}',
      (result->'errors') || jsonb_build_array('File size exceeds 50MB limit'));
  END IF;

  -- Check MIME type
  IF NOT (p_mime_type = ANY(allowed_types)) THEN
    result := jsonb_set(result, '{valid}', 'false');
    result := jsonb_set(result, '{errors}',
      (result->'errors') || jsonb_build_array('File type not allowed'));
  END IF;

  -- Check filename for security
  IF p_filename ~ '\.\.(\/|\\)' OR p_filename ~ '[<>:"|?*]' THEN
    result := jsonb_set(result, '{valid}', 'false');
    result := jsonb_set(result, '{errors}',
      (result->'errors') || jsonb_build_array('Invalid filename'));
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired attachments
CREATE OR REPLACE FUNCTION cleanup_expired_attachments()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired attachments for deletion
  WITH expired_files AS (
    UPDATE public.ticket_attachments
    SET scan_status = 'expired'
    WHERE expires_at IS NOT NULL
      AND expires_at <= NOW()
      AND scan_status != 'expired'
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired_files;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;