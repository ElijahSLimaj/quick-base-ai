-- Add enterprise ticketing schema
-- This migration adds organizations, team members, and ticketing functionality

-- Create organizations table
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  stripe_customer_id text UNIQUE,
  plan_name text NOT NULL DEFAULT 'trial'::text CHECK (plan_name = ANY (ARRAY['trial'::text, 'starter'::text, 'pro'::text, 'enterprise'::text])),
  seat_count integer DEFAULT 1,
  max_seats integer DEFAULT 1,
  additional_seats integer DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text])),
  permissions jsonb DEFAULT '{"manage_team": false, "view_tickets": true, "create_tickets": true, "manage_billing": false, "manage_tickets": false, "view_analytics": false}'::jsonb,
  invited_by uuid,
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'disabled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);

-- Create organization_invites table
CREATE TABLE public.organization_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  invited_by uuid NOT NULL,
  invited_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])),
  CONSTRAINT organization_invites_pkey PRIMARY KEY (id),
  CONSTRAINT organization_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);

-- Create tickets table
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  website_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])),
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  category text NOT NULL DEFAULT 'general'::text,
  customer_email text,
  customer_name text,
  assignee_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  first_response_at timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  original_query text,
  ai_response text,
  ai_confidence numeric(3,2),
  escalation_reason text CHECK (escalation_reason = ANY (ARRAY['low_confidence'::text, 'explicit_request'::text, 'complex_query'::text, 'unsupported_language'::text])),
  sla_due_at timestamp with time zone,
  tags text[],
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id),
  CONSTRAINT tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id),
  CONSTRAINT tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Create ticket_messages table
CREATE TABLE public.ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'reply'::text CHECK (message_type = ANY (ARRAY['reply'::text, 'note'::text, 'status_change'::text])),
  user_id uuid,
  customer_email text,
  customer_name text,
  author_type text NOT NULL CHECK (author_type = ANY (ARRAY['team'::text, 'customer'::text, 'system'::text])),
  is_internal boolean DEFAULT false,
  is_first_response boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT ticket_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create ticket_attachments table
CREATE TABLE public.ticket_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  message_id uuid,
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid,
  customer_email text,
  is_internal boolean DEFAULT false,
  is_public boolean DEFAULT true,
  scan_status text DEFAULT 'pending'::text CHECK (scan_status = ANY (ARRAY['pending'::text, 'safe'::text, 'blocked'::text])),
  scan_result jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT ticket_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.ticket_messages(id),
  CONSTRAINT ticket_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)
);

-- Add organization_id to websites table
ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS plan_name text DEFAULT 'trial'::text;
ALTER TABLE public.websites ADD CONSTRAINT websites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

-- Create indexes
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_team_members_organization_id ON public.team_members(organization_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_tickets_website_id ON public.tickets(website_id);
CREATE INDEX idx_tickets_organization_id ON public.tickets(organization_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_assignee_id ON public.tickets(assignee_id);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their organizations" ON public.team_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for tickets
CREATE POLICY "Users can view tickets from their organizations" ON public.tickets
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create tickets for their organizations" ON public.tickets
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update tickets from their organizations" ON public.tickets
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.team_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for ticket messages
CREATE POLICY "Users can view ticket messages from their organizations" ON public.ticket_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id IN (
        SELECT organization_id FROM public.team_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can create ticket messages for their organizations" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE organization_id IN (
        SELECT organization_id FROM public.team_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  year_part text;
  sequence_part text;
  ticket_number text;
BEGIN
  year_part := EXTRACT(year FROM now())::text;

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SPLIT_PART(ticket_number, '-', 2) AS INTEGER)), 0) + 1
  INTO sequence_part
  FROM public.tickets
  WHERE ticket_number LIKE year_part || '-%';

  ticket_number := year_part || '-' || LPAD(sequence_part, 6, '0');

  RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();