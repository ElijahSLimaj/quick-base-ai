-- Test complete enterprise onboarding flow
-- This script tests the entire ticketing system end-to-end

-- ========================================
-- TEST 1: CREATE ORGANIZATION
-- ========================================

-- Insert test organization (replace with your actual user_id)
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with actual user ID
  org_id UUID;
  website_id UUID;
  invite_id UUID;
  invite_token TEXT;
  ticket_id UUID;
  message_id UUID;
BEGIN
  -- Skip if no auth context (for testing purposes)
  IF auth.uid() IS NULL THEN
    RAISE NOTICE 'No auth context - skipping tests';
    RETURN;
  END IF;

  test_user_id := auth.uid();

  RAISE NOTICE 'Testing enterprise flow for user: %', test_user_id;

  -- Test organization creation
  INSERT INTO public.organizations (name, owner_id, plan_name, max_seats)
  VALUES ('Test Enterprise Corp', test_user_id, 'enterprise', 5)
  RETURNING id INTO org_id;

  RAISE NOTICE 'Created organization: %', org_id;

  -- Verify organization owner was auto-added as team member
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE organization_id = org_id AND user_id = test_user_id AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Organization owner was not auto-added as team member';
  END IF;

  RAISE NOTICE 'Organization owner correctly added as team member';

  -- ========================================
  -- TEST 2: CREATE WEBSITE LINKED TO ORGANIZATION
  -- ========================================

  -- Create website linked to organization
  INSERT INTO public.websites (name, domain, owner_id, organization_id, plan_name)
  VALUES ('Test Enterprise Website', 'enterprise.example.com', test_user_id, org_id, 'enterprise')
  RETURNING id INTO website_id;

  RAISE NOTICE 'Created website linked to organization: %', website_id;

  -- ========================================
  -- TEST 3: INVITE TEAM MEMBER
  -- ========================================

  -- Create invitation
  INSERT INTO public.organization_invites (organization_id, email, role, invited_by, message)
  VALUES (org_id, 'team@example.com', 'admin', test_user_id, 'Welcome to our enterprise team!')
  RETURNING id, token INTO invite_id, invite_token;

  RAISE NOTICE 'Created invitation: % with token: %', invite_id, invite_token;

  -- ========================================
  -- TEST 4: CREATE TICKET
  -- ========================================

  -- Create test ticket
  INSERT INTO public.tickets (
    website_id,
    title,
    description,
    priority,
    category,
    customer_email,
    customer_name,
    original_query,
    ai_response,
    ai_confidence,
    escalation_reason
  ) VALUES (
    website_id,
    'Integration Help Needed',
    'We need help integrating the API with our system',
    'high',
    'technical',
    'customer@enterprise.com',
    'John Enterprise',
    'How do I integrate your API?',
    'Here are the API docs...',
    0.65,
    'low_confidence'
  ) RETURNING id INTO ticket_id;

  RAISE NOTICE 'Created ticket: %', ticket_id;

  -- ========================================
  -- TEST 5: ADD TICKET MESSAGE
  -- ========================================

  -- Add team response
  INSERT INTO public.ticket_messages (ticket_id, user_id, message, author_type)
  VALUES (ticket_id, test_user_id, 'Thanks for contacting us! I''ll help you with the integration.', 'team')
  RETURNING id INTO message_id;

  RAISE NOTICE 'Added team message: %', message_id;

  -- Add customer response
  INSERT INTO public.ticket_messages (ticket_id, customer_email, customer_name, message, author_type)
  VALUES (ticket_id, 'customer@enterprise.com', 'John Enterprise', 'Great! When can we schedule a call?', 'customer');

  RAISE NOTICE 'Added customer message';

  -- ========================================
  -- TEST 6: CREATE ATTACHMENT
  -- ========================================

  -- Add file attachment
  INSERT INTO public.ticket_attachments (
    ticket_id,
    message_id,
    filename,
    original_filename,
    file_path,
    file_size,
    mime_type,
    uploaded_by
  ) VALUES (
    ticket_id,
    message_id,
    'integration-guide.pdf',
    'API Integration Guide.pdf',
    'tickets/2024/10/' || ticket_id || '/integration-guide-' || encode(gen_random_bytes(8), 'hex') || '.pdf',
    245760,
    'application/pdf',
    test_user_id
  );

  RAISE NOTICE 'Added file attachment';

  -- ========================================
  -- VERIFICATION TESTS
  -- ========================================

  -- Verify organization seat count
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id AND seat_count = 1 -- Should be 1 (owner only)
  ) THEN
    RAISE EXCEPTION 'Organization seat count is incorrect';
  END IF;

  -- Verify ticket auto-generated number
  IF NOT EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = ticket_id AND ticket_number LIKE 'TKT-2024-%'
  ) THEN
    RAISE EXCEPTION 'Ticket number was not auto-generated correctly';
  END IF;

  -- Verify first response tracking
  IF NOT EXISTS (
    SELECT 1 FROM public.tickets
    WHERE id = ticket_id AND first_response_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'First response was not tracked correctly';
  END IF;

  RAISE NOTICE 'All tests passed successfully!';

END $$;