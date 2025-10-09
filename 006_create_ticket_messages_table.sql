-- Create ticket_messages table for ticket conversations and communication
-- Handles both customer responses and internal team communication

CREATE TABLE public.ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,

  -- Message content
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'reply' CHECK (message_type IN ('reply', 'note', 'status_change', 'assignment')),

  -- Author information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Team member who wrote message
  customer_email TEXT, -- Customer email if message is from customer
  customer_name TEXT, -- Customer name if message is from customer
  author_type TEXT NOT NULL CHECK (author_type IN ('team', 'customer', 'system')),

  -- Message properties
  is_internal BOOLEAN DEFAULT false, -- Internal notes only visible to team
  is_first_response BOOLEAN DEFAULT false, -- Marks the first team response for SLA tracking

  -- Rich content support
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'markdown')),
  attachments JSONB DEFAULT '[]', -- References to attached files

  -- Email integration
  email_message_id TEXT, -- For tracking email thread continuity
  in_reply_to TEXT, -- Email threading

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE, -- When message was read by recipient
  read_by UUID REFERENCES auth.users(id) -- Who read the message
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_ticket_messages_updated_at
  BEFORE UPDATE ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_messages_updated_at();

-- Function to handle first response tracking and SLA updates
CREATE OR REPLACE FUNCTION handle_first_response()
RETURNS TRIGGER AS $$
DECLARE
  ticket_record public.tickets%ROWTYPE;
  response_time_minutes INTEGER;
BEGIN
  -- Only process team responses, not customer messages or internal notes
  IF NEW.author_type = 'team' AND NOT NEW.is_internal THEN
    -- Get ticket details
    SELECT * INTO ticket_record FROM public.tickets WHERE id = NEW.ticket_id;

    -- Check if this is the first team response
    IF ticket_record.first_response_at IS NULL THEN
      -- Calculate response time
      response_time_minutes := EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 60;

      -- Update ticket with first response information
      UPDATE public.tickets
      SET first_response_at = NOW(),
          first_response_time_minutes = response_time_minutes,
          sla_breach = check_sla_breach(priority, created_at, NOW())
      WHERE id = NEW.ticket_id;

      -- Mark this message as the first response
      NEW.is_first_response = true;
    END IF;

    -- If ticket was waiting for customer, move it back to in_progress
    IF ticket_record.status = 'waiting_customer' THEN
      UPDATE public.tickets
      SET status = 'in_progress'
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;

  -- If customer responds and ticket is in_progress, mark as waiting_customer
  IF NEW.author_type = 'customer' THEN
    SELECT * INTO ticket_record FROM public.tickets WHERE id = NEW.ticket_id;

    IF ticket_record.status = 'in_progress' THEN
      UPDATE public.tickets
      SET status = 'waiting_customer'
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle first response and status updates
CREATE TRIGGER handle_first_response_trigger
  BEFORE INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_first_response();

-- Function to automatically set author information
CREATE OR REPLACE FUNCTION set_message_author()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is provided, it's a team message
  IF NEW.user_id IS NOT NULL THEN
    NEW.author_type = 'team';
    -- Clear customer fields if accidentally set
    NEW.customer_email = NULL;
    NEW.customer_name = NULL;
  -- If customer info is provided, it's a customer message
  ELSIF NEW.customer_email IS NOT NULL THEN
    NEW.author_type = 'customer';
  -- Otherwise, it's a system message
  ELSE
    NEW.author_type = 'system';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set author type
CREATE TRIGGER set_message_author_trigger
  BEFORE INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_message_author();

-- Create indexes for performance
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_user_id ON public.ticket_messages(user_id);
CREATE INDEX idx_ticket_messages_created_at ON public.ticket_messages(created_at);
CREATE INDEX idx_ticket_messages_author_type ON public.ticket_messages(author_type);
CREATE INDEX idx_ticket_messages_is_internal ON public.ticket_messages(is_internal);
CREATE INDEX idx_ticket_messages_customer_email ON public.ticket_messages(customer_email);

-- Enable Row Level Security
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_messages
CREATE POLICY "Users can view messages for tickets they have access to" ON public.ticket_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE (
        -- Individual website owners can see messages for their tickets
        (organization_id IS NULL AND website_id IN (
          SELECT id FROM public.websites WHERE owner_id = auth.uid()
        )) OR
        -- Organization members can see messages for organization tickets
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
        -- Customers can see messages for their tickets
        (customer_user_id = auth.uid() OR customer_email = auth.email())
      )
    ) AND (
      -- Team members can see all messages including internal notes
      user_id IS NOT NULL OR
      -- Customers can only see non-internal messages
      (customer_email = auth.email() AND is_internal = false) OR
      -- System messages are visible to all who can see the ticket
      author_type = 'system'
    )
  );

CREATE POLICY "Authorized users can create messages" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE (
        -- Individual website owners can create messages for their tickets
        (organization_id IS NULL AND website_id IN (
          SELECT id FROM public.websites WHERE owner_id = auth.uid()
        )) OR
        -- Organization members can create messages for organization tickets
        (organization_id IS NOT NULL AND auth.uid() IN (
          SELECT user_id FROM public.team_members
          WHERE organization_id = tickets.organization_id
            AND status = 'active'
            AND (permissions->>'view_tickets')::boolean = true
        )) OR
        -- Customers can create messages for their tickets
        (customer_user_id = auth.uid() OR customer_email = auth.email())
      )
    )
  );

CREATE POLICY "Users can update their own messages" ON public.ticket_messages
  FOR UPDATE USING (
    user_id = auth.uid() OR
    customer_email = auth.email()
  );

CREATE POLICY "Authorized users can delete messages" ON public.ticket_messages
  FOR DELETE USING (
    -- Only organization owners and individual website owners can delete messages
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
    -- Users can delete their own messages
    user_id = auth.uid()
  );

-- Function to create system message for ticket events
CREATE OR REPLACE FUNCTION create_system_message(
  p_ticket_id UUID,
  p_message TEXT,
  p_message_type TEXT DEFAULT 'status_change'
)
RETURNS UUID AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO public.ticket_messages (
    ticket_id,
    message,
    message_type,
    author_type,
    is_internal
  ) VALUES (
    p_ticket_id,
    p_message,
    p_message_type,
    'system',
    false
  ) RETURNING id INTO message_id;

  RETURN message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get message statistics for a ticket
CREATE OR REPLACE FUNCTION get_ticket_message_stats(p_ticket_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_messages', COUNT(*),
    'team_messages', COUNT(*) FILTER (WHERE author_type = 'team'),
    'customer_messages', COUNT(*) FILTER (WHERE author_type = 'customer'),
    'internal_notes', COUNT(*) FILTER (WHERE is_internal = true),
    'last_message_at', MAX(created_at),
    'last_team_message_at', MAX(created_at) FILTER (WHERE author_type = 'team'),
    'last_customer_message_at', MAX(created_at) FILTER (WHERE author_type = 'customer')
  ) INTO stats
  FROM public.ticket_messages
  WHERE ticket_id = p_ticket_id;

  RETURN stats;
END;
$$ LANGUAGE plpgsql;