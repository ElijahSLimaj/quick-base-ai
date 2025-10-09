-- Create tickets table for enterprise customer support system
-- Handles both individual and organization-based ticketing with AI context preservation

CREATE TABLE public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationship to websites (primary) and organizations (for enterprise)
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Ticket identification
  ticket_number TEXT UNIQUE NOT NULL, -- Human-friendly ticket number like "TKT-2024-001"

  -- Ticket content
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Status and priority management
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request', 'bug_report', 'integration')),

  -- Assignment and ownership
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- Customer information (for non-logged-in users)
  customer_email TEXT,
  customer_name TEXT,
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If customer is registered

  -- AI context preservation
  original_query TEXT, -- The original question asked to AI
  ai_response TEXT, -- What the AI responded with
  ai_confidence DECIMAL(3,2), -- AI confidence score (0.00 to 1.00)
  escalation_reason TEXT, -- Why it was escalated: "low_confidence", "user_request", "unsatisfied"

  -- Resolution tracking
  resolution TEXT, -- How the ticket was resolved
  resolution_time_minutes INTEGER, -- Time to resolution in minutes
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  customer_satisfaction_feedback TEXT,

  -- SLA tracking
  first_response_at TIMESTAMP WITH TIME ZONE,
  first_response_time_minutes INTEGER,
  sla_breach BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Set resolved_at when status changes to resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = NOW();
    -- Calculate resolution time
    NEW.resolution_time_minutes = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60;
  END IF;

  -- Set closed_at when status changes to closed
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.closed_at = NOW();
    -- If not already resolved, set resolved_at as well
    IF NEW.resolved_at IS NULL THEN
      NEW.resolved_at = NOW();
      NEW.resolution_time_minutes = EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 60;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at and status changes
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tickets_updated_at();

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  counter INTEGER;
  ticket_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Get the next counter for this year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(ticket_number FROM 'TKT-' || current_year || '-(\d+)') AS INTEGER
    )
  ), 0) + 1 INTO counter
  FROM public.tickets
  WHERE ticket_number LIKE 'TKT-' || current_year || '-%';

  -- Format as TKT-YYYY-NNN (zero-padded to 3 digits)
  ticket_num := 'TKT-' || current_year || '-' || LPAD(counter::TEXT, 3, '0');

  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Function to set organization_id based on website
CREATE OR REPLACE FUNCTION set_ticket_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Set organization_id based on the website's organization
  SELECT organization_id INTO NEW.organization_id
  FROM public.websites
  WHERE id = NEW.website_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set organization
CREATE TRIGGER set_ticket_organization_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_organization();

-- Create indexes for performance
CREATE INDEX idx_tickets_website_id ON public.tickets(website_id);
CREATE INDEX idx_tickets_organization_id ON public.tickets(organization_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX idx_tickets_customer_email ON public.tickets(customer_email);
CREATE INDEX idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX idx_tickets_category ON public.tickets(category);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tickets
CREATE POLICY "Users can view tickets for their websites/organizations" ON public.tickets
  FOR SELECT USING (
    -- Individual website owners can see tickets for their websites
    (organization_id IS NULL AND website_id IN (
      SELECT id FROM public.websites WHERE owner_id = auth.uid()
    )) OR
    -- Organization members can see tickets for organization websites
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
    -- Customers can see their own tickets
    (customer_user_id = auth.uid() OR customer_email = auth.email())
  );

CREATE POLICY "Authorized users can create tickets" ON public.tickets
  FOR INSERT WITH CHECK (
    -- Individual website owners can create tickets for their websites
    (organization_id IS NULL AND website_id IN (
      SELECT id FROM public.websites WHERE owner_id = auth.uid()
    )) OR
    -- Organization members can create tickets for organization websites
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = tickets.organization_id
        AND status = 'active'
        AND (permissions->>'create_tickets')::boolean = true
    )) OR
    -- Customers can create tickets (will be validated by application logic)
    customer_email IS NOT NULL
  );

CREATE POLICY "Authorized users can update tickets" ON public.tickets
  FOR UPDATE USING (
    -- Individual website owners can update tickets for their websites
    (organization_id IS NULL AND website_id IN (
      SELECT id FROM public.websites WHERE owner_id = auth.uid()
    )) OR
    -- Organization members with manage_tickets permission can update
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = tickets.organization_id
        AND status = 'active'
        AND (permissions->>'manage_tickets')::boolean = true
    )) OR
    -- Assigned team members can update their tickets
    assigned_to = auth.uid()
  );

CREATE POLICY "Authorized users can delete tickets" ON public.tickets
  FOR DELETE USING (
    -- Only organization owners and individual website owners can delete tickets
    (organization_id IS NULL AND website_id IN (
      SELECT id FROM public.websites WHERE owner_id = auth.uid()
    )) OR
    (organization_id IS NOT NULL AND auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ))
  );

-- Function to calculate SLA breach based on priority
CREATE OR REPLACE FUNCTION check_sla_breach(
  ticket_priority TEXT,
  ticket_created_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  sla_minutes INTEGER;
  response_time_minutes INTEGER;
BEGIN
  -- Define SLA targets by priority (in minutes)
  CASE ticket_priority
    WHEN 'urgent' THEN sla_minutes := 60;    -- 1 hour
    WHEN 'high' THEN sla_minutes := 240;     -- 4 hours
    WHEN 'medium' THEN sla_minutes := 1440;  -- 24 hours
    WHEN 'low' THEN sla_minutes := 4320;     -- 3 days
    ELSE sla_minutes := 1440; -- Default to 24 hours
  END CASE;

  -- If no first response yet, check against current time
  IF first_response_at IS NULL THEN
    response_time_minutes := EXTRACT(EPOCH FROM (NOW() - ticket_created_at)) / 60;
  ELSE
    response_time_minutes := EXTRACT(EPOCH FROM (first_response_at - ticket_created_at)) / 60;
  END IF;

  RETURN response_time_minutes > sla_minutes;
END;
$$ LANGUAGE plpgsql;

-- Function to update SLA status
CREATE OR REPLACE FUNCTION update_sla_status()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.tickets
  SET sla_breach = check_sla_breach(priority, created_at, first_response_at)
  WHERE status IN ('open', 'in_progress', 'waiting_customer')
    AND sla_breach = false; -- Only update non-breached tickets

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;