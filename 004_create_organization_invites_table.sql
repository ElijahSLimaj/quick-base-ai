-- Create organization_invites table for managing pending team member invitations
-- Handles email invitations to join organizations with proper security and expiration

CREATE TABLE public.organization_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Invitation details
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')), -- Can't invite as owner
  permissions JSONB DEFAULT '{}', -- Custom permissions override

  -- Invitation token and security
  token TEXT NOT NULL UNIQUE, -- Secure random token for accepting invitation
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Invitation tracking
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id), -- User who accepted (may differ from invited email)

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),

  -- Optional personal message
  message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique pending invitation per email per organization
  UNIQUE(organization_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_organization_invites_updated_at
  BEFORE UPDATE ON public.organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_invites_updated_at();

-- Create indexes for performance
CREATE INDEX idx_organization_invites_organization_id ON public.organization_invites(organization_id);
CREATE INDEX idx_organization_invites_email ON public.organization_invites(email);
CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);
CREATE INDEX idx_organization_invites_status ON public.organization_invites(status);
CREATE INDEX idx_organization_invites_expires_at ON public.organization_invites(expires_at);

-- Enable Row Level Security
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_invites
CREATE POLICY "Users can view invites for their organizations" ON public.organization_invites
  FOR SELECT USING (
    -- Organization owners can see all invites
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ) OR
    -- Team members with manage_team permission can see invites
    auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = organization_invites.organization_id
        AND status = 'active'
        AND (permissions->>'manage_team')::boolean = true
    ) OR
    -- Users can see invites sent to their email
    auth.email() = email
  );

CREATE POLICY "Authorized users can create invites" ON public.organization_invites
  FOR INSERT WITH CHECK (
    -- Organization owners can invite
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ) OR
    -- Team members with manage_team permission can invite
    auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = organization_invites.organization_id
        AND status = 'active'
        AND (permissions->>'manage_team')::boolean = true
    )
  );

CREATE POLICY "Authorized users can update invites" ON public.organization_invites
  FOR UPDATE USING (
    -- Organization owners can update
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ) OR
    -- Team members with manage_team permission can update
    auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = organization_invites.organization_id
        AND status = 'active'
        AND (permissions->>'manage_team')::boolean = true
    )
  );

CREATE POLICY "Authorized users can delete invites" ON public.organization_invites
  FOR DELETE USING (
    -- Organization owners can delete
    auth.uid() IN (
      SELECT owner_id FROM public.organizations WHERE id = organization_id
    ) OR
    -- Team members with manage_team permission can delete
    auth.uid() IN (
      SELECT user_id FROM public.team_members
      WHERE organization_id = organization_invites.organization_id
        AND status = 'active'
        AND (permissions->>'manage_team')::boolean = true
    )
  );

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  -- Generate a secure random token (32 bytes = 64 hex characters)
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invitation token
CREATE OR REPLACE FUNCTION set_invite_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := generate_invite_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invite_token_trigger
  BEFORE INSERT ON public.organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_token();

-- Function to check if invitation is valid and not expired
CREATE OR REPLACE FUNCTION is_invite_valid(invite_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_invites
    WHERE token = invite_token
      AND status = 'pending'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Function to accept invitation and create team member
CREATE OR REPLACE FUNCTION accept_organization_invite(
  invite_token TEXT,
  accepting_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  invite_record public.organization_invites%ROWTYPE;
  org_record public.organizations%ROWTYPE;
  result JSONB;
BEGIN
  -- Get the invitation record
  SELECT * INTO invite_record
  FROM public.organization_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Invalid or expired invitation"}'::jsonb;
  END IF;

  -- Get organization details
  SELECT * INTO org_record
  FROM public.organizations
  WHERE id = invite_record.organization_id;

  -- Check seat limits
  IF NOT check_seat_limit(invite_record.organization_id) THEN
    RETURN '{"success": false, "error": "Organization has reached its seat limit"}'::jsonb;
  END IF;

  -- Check if user is already a team member
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE organization_id = invite_record.organization_id
      AND user_id = accepting_user_id
  ) THEN
    RETURN '{"success": false, "error": "User is already a member of this organization"}'::jsonb;
  END IF;

  -- Create team member record
  INSERT INTO public.team_members (
    organization_id,
    user_id,
    role,
    permissions,
    invited_by,
    invited_at,
    joined_at,
    status
  ) VALUES (
    invite_record.organization_id,
    accepting_user_id,
    invite_record.role,
    COALESCE(invite_record.permissions, '{}'::jsonb),
    invite_record.invited_by,
    invite_record.invited_at,
    NOW(),
    'active'
  );

  -- Mark invitation as accepted
  UPDATE public.organization_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = accepting_user_id
  WHERE id = invite_record.id;

  -- Return success with organization details
  result := jsonb_build_object(
    'success', true,
    'organization', jsonb_build_object(
      'id', org_record.id,
      'name', org_record.name,
      'slug', org_record.slug
    ),
    'role', invite_record.role
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke/cancel invitation
CREATE OR REPLACE FUNCTION revoke_organization_invite(invite_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.organization_invites
  SET status = 'revoked',
      updated_at = NOW()
  WHERE id = invite_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations (should be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.organization_invites
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at <= NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;