-- Create assignment tracking table for load balancing and round-robin fallback
-- This table tracks assignment metadata per organization

CREATE TABLE public.assignment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Organization context
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Assignment method used
  assignment_method TEXT NOT NULL DEFAULT 'load_balancing' CHECK (assignment_method IN ('load_balancing', 'round_robin', 'manual')),
  
  -- Last assigned user for round-robin fallback
  last_assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Assignment statistics
  total_assignments INTEGER DEFAULT 0,
  load_balancing_assignments INTEGER DEFAULT 0,
  round_robin_fallback_assignments INTEGER DEFAULT 0,
  
  -- Configuration
  is_auto_assignment_enabled BOOLEAN DEFAULT TRUE,
  assignment_preferences JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one tracking record per organization
  UNIQUE(organization_id)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assignment_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_assignment_tracking_updated_at
  BEFORE UPDATE ON public.assignment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_tracking_updated_at();

-- Create indexes for performance
CREATE INDEX idx_assignment_tracking_organization_id ON public.assignment_tracking(organization_id);
CREATE INDEX idx_assignment_tracking_last_assigned_user ON public.assignment_tracking(last_assigned_user_id);
CREATE INDEX idx_assignment_tracking_last_assigned_at ON public.assignment_tracking(last_assigned_at);

-- Enable Row Level Security
ALTER TABLE public.assignment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view assignment tracking" ON public.assignment_tracking
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can update assignment tracking" ON public.assignment_tracking
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.team_members 
      WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role IN ('owner', 'admin')
    )
  );

-- Function to get next assignee using load balancing + round-robin fallback
CREATE OR REPLACE FUNCTION get_next_assignee(org_id UUID)
RETURNS TABLE(
  assignee_id UUID,
  assignment_method TEXT,
  open_tickets_count INTEGER,
  last_assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  active_members_count INTEGER;
  min_open_tickets INTEGER;
BEGIN
  -- Check if organization has active team members
  SELECT COUNT(*) INTO active_members_count
  FROM public.team_members tm
  WHERE tm.organization_id = org_id 
    AND tm.status = 'active';

  -- Return NULL if no active members
  IF active_members_count = 0 THEN
    RETURN;
  END IF;

  -- Get team members with their current workload (open tickets count)
  -- Order by load balancing (open tickets ASC) then round-robin fallback (last assigned ASC)
  RETURN QUERY
  WITH member_workload AS (
    SELECT 
      tm.user_id,
      tm.organization_id,
      tm.created_at as member_since,
      COALESCE(open_tickets.count, 0) as open_tickets_count,
      at.last_assigned_at,
      at.last_assigned_user_id
    FROM public.team_members tm
    LEFT JOIN (
      SELECT 
        assigned_to,
        COUNT(*) as count
      FROM public.tickets
      WHERE assigned_to IS NOT NULL
        AND status IN ('open', 'in_progress', 'waiting_customer')
      GROUP BY assigned_to
    ) open_tickets ON open_tickets.assigned_to = tm.user_id
    LEFT JOIN public.assignment_tracking at ON at.organization_id = tm.organization_id
    WHERE tm.organization_id = org_id 
      AND tm.status = 'active'
  ),
  ranked_members AS (
    SELECT 
      user_id,
      open_tickets_count,
      last_assigned_at,
      ROW_NUMBER() OVER (
        ORDER BY 
          open_tickets_count ASC,  -- Load balancing: least loaded first
          CASE 
            WHEN last_assigned_user_id = user_id THEN last_assigned_at 
            ELSE '1970-01-01'::timestamp 
          END ASC,  -- Round-robin fallback: longest since last assignment
          member_since ASC  -- Final tiebreaker: earliest team member
      ) as rank
    FROM member_workload
  )
  SELECT 
    rm.user_id::UUID as assignee_id,
    CASE 
      WHEN rm.rank = 1 AND rm.open_tickets_count = (
        SELECT MIN(open_tickets_count) FROM ranked_members
      ) THEN 'load_balancing'::TEXT
      ELSE 'round_robin'::TEXT
    END as assignment_method,
    rm.open_tickets_count::INTEGER,
    rm.last_assigned_at
  FROM ranked_members rm
  WHERE rm.rank = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update assignment tracking after assignment
CREATE OR REPLACE FUNCTION update_assignment_tracking(
  org_id UUID,
  assigned_user_id UUID,
  assignment_method TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update or insert assignment tracking record
  INSERT INTO public.assignment_tracking (
    organization_id,
    last_assigned_user_id,
    last_assigned_at,
    assignment_method,
    total_assignments,
    load_balancing_assignments,
    round_robin_fallback_assignments
  )
  VALUES (
    org_id,
    assigned_user_id,
    NOW(),
    assignment_method,
    1,
    CASE WHEN assignment_method = 'load_balancing' THEN 1 ELSE 0 END,
    CASE WHEN assignment_method = 'round_robin' THEN 1 ELSE 0 END
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    last_assigned_user_id = assigned_user_id,
    last_assigned_at = NOW(),
    assignment_method = assignment_method,
    total_assignments = assignment_tracking.total_assignments + 1,
    load_balancing_assignments = CASE 
      WHEN assignment_method = 'load_balancing' 
      THEN assignment_tracking.load_balancing_assignments + 1 
      ELSE assignment_tracking.load_balancing_assignments 
    END,
    round_robin_fallback_assignments = CASE 
      WHEN assignment_method = 'round_robin' 
      THEN assignment_tracking.round_robin_fallback_assignments + 1 
      ELSE assignment_tracking.round_robin_fallback_assignments 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize assignment tracking for existing organizations
CREATE OR REPLACE FUNCTION initialize_assignment_tracking()
RETURNS VOID AS $$
BEGIN
  -- Create assignment tracking records for organizations that don't have them
  INSERT INTO public.assignment_tracking (organization_id)
  SELECT id 
  FROM public.organizations 
  WHERE id NOT IN (SELECT organization_id FROM public.assignment_tracking)
    AND plan_name = 'enterprise';  -- Only for enterprise organizations
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
