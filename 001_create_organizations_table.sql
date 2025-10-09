-- Create organizations table for enterprise structure
-- This supports multi-user enterprise accounts with proper billing and seat management

CREATE TABLE public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- For friendly URLs like /org/acme-corp
  description TEXT,

  -- Billing information
  stripe_customer_id TEXT UNIQUE,
  plan_name TEXT NOT NULL DEFAULT 'trial' CHECK (plan_name IN ('trial', 'starter', 'pro', 'enterprise')),

  -- Seat management for enterprise plans
  seat_count INTEGER DEFAULT 1, -- Current number of team members
  max_seats INTEGER DEFAULT 1, -- Maximum allowed seats based on plan
  additional_seats INTEGER DEFAULT 0, -- Extra seats beyond base plan (for enterprise)

  -- Organization settings
  settings JSONB DEFAULT '{}',

  -- Ownership and timestamps
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Create index for performance
CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Note: Team member access will be added after team_members table is created
CREATE POLICY "Users can view organizations they own" ON public.organizations
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Organization owners can update their organizations" ON public.organizations
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Organization owners can delete their organizations" ON public.organizations
  FOR DELETE USING (auth.uid() = owner_id);

-- Function to generate unique slug from organization name
CREATE OR REPLACE FUNCTION generate_organization_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION set_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_organization_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organization_slug_trigger
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_slug();