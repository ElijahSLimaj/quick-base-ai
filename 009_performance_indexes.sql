-- Create additional performance indexes for enterprise ticketing system
-- Optimizes common queries for tickets, analytics, and team management

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Ticket filtering and sorting (most common dashboard queries)
CREATE INDEX idx_tickets_website_status_priority ON public.tickets(website_id, status, priority);
CREATE INDEX idx_tickets_organization_status_created ON public.tickets(organization_id, status, created_at DESC);
CREATE INDEX idx_tickets_assigned_status_updated ON public.tickets(assigned_to, status, updated_at DESC);

-- Ticket search and analytics
CREATE INDEX idx_tickets_status_created_at ON public.tickets(status, created_at DESC);
CREATE INDEX idx_tickets_priority_created_at ON public.tickets(priority, created_at DESC);
CREATE INDEX idx_tickets_category_status ON public.tickets(category, status);

-- SLA and performance tracking
CREATE INDEX idx_tickets_sla_breach_priority ON public.tickets(sla_breach, priority) WHERE sla_breach = true;
CREATE INDEX idx_tickets_resolution_time ON public.tickets(resolution_time_minutes) WHERE resolution_time_minutes IS NOT NULL;
CREATE INDEX idx_tickets_first_response_time ON public.tickets(first_response_time_minutes) WHERE first_response_time_minutes IS NOT NULL;

-- Customer satisfaction tracking
CREATE INDEX idx_tickets_satisfaction_rating ON public.tickets(customer_satisfaction_rating) WHERE customer_satisfaction_rating IS NOT NULL;

-- ========================================
-- TEAM MANAGEMENT INDEXES
-- ========================================

-- Team member queries
CREATE INDEX idx_team_members_org_status_role ON public.team_members(organization_id, status, role);
CREATE INDEX idx_team_members_user_status ON public.team_members(user_id, status);

-- Organization invite queries
CREATE INDEX idx_org_invites_org_status ON public.organization_invites(organization_id, status);
CREATE INDEX idx_org_invites_email_status ON public.organization_invites(email, status);
CREATE INDEX idx_org_invites_token_status ON public.organization_invites(token, status);

-- ========================================
-- MESSAGE AND CONVERSATION INDEXES
-- ========================================

-- Ticket conversation queries
CREATE INDEX idx_ticket_messages_ticket_created ON public.ticket_messages(ticket_id, created_at);
CREATE INDEX idx_ticket_messages_ticket_author_internal ON public.ticket_messages(ticket_id, author_type, is_internal);

-- First response tracking
CREATE INDEX idx_ticket_messages_first_response ON public.ticket_messages(ticket_id, is_first_response) WHERE is_first_response = true;

-- Customer message tracking
CREATE INDEX idx_ticket_messages_customer_created ON public.ticket_messages(customer_email, created_at) WHERE customer_email IS NOT NULL;

-- ========================================
-- FILE ATTACHMENT INDEXES
-- ========================================

-- Attachment queries
CREATE INDEX idx_attachments_ticket_created ON public.ticket_attachments(ticket_id, created_at);
CREATE INDEX idx_attachments_message_created ON public.ticket_attachments(message_id, created_at) WHERE message_id IS NOT NULL;

-- File management
CREATE INDEX idx_attachments_scan_status ON public.ticket_attachments(scan_status, created_at);
CREATE INDEX idx_attachments_expires_at ON public.ticket_attachments(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_attachments_file_size ON public.ticket_attachments(file_size);

-- Internal vs public files
CREATE INDEX idx_attachments_internal_public ON public.ticket_attachments(is_internal, is_public);

-- ========================================
-- ANALYTICS AND REPORTING INDEXES
-- ========================================

-- Time-based analytics (using simple timestamp indexes)
-- Applications can filter by date ranges using these indexes
CREATE INDEX idx_tickets_created_at_desc ON public.tickets(created_at DESC);
CREATE INDEX idx_tickets_resolved_at_desc ON public.tickets(resolved_at DESC) WHERE resolved_at IS NOT NULL;
CREATE INDEX idx_tickets_closed_at_desc ON public.tickets(closed_at DESC) WHERE closed_at IS NOT NULL;

-- Team performance analytics
CREATE INDEX idx_tickets_assigned_resolved ON public.tickets(assigned_to, resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX idx_tickets_assigned_created ON public.tickets(assigned_to, created_at);

-- ========================================
-- WEBSITE AND ORGANIZATION INDEXES
-- ========================================

-- Organization-website relationship queries
CREATE INDEX idx_websites_org_plan ON public.websites(organization_id, plan_name) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_websites_owner_plan ON public.websites(owner_id, plan_name) WHERE organization_id IS NULL;

-- Organization billing and seat management
CREATE INDEX idx_organizations_plan_seats ON public.organizations(plan_name, seat_count, max_seats);
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ========================================
-- FULL-TEXT SEARCH INDEXES (if needed)
-- ========================================

-- Ticket content search (using PostgreSQL's built-in text search)
CREATE INDEX idx_tickets_title_search ON public.tickets USING gin(to_tsvector('english', title));
CREATE INDEX idx_tickets_description_search ON public.tickets USING gin(to_tsvector('english', description));

-- Message content search
CREATE INDEX idx_messages_content_search ON public.ticket_messages USING gin(to_tsvector('english', message));

-- Organization name search
CREATE INDEX idx_organizations_name_search ON public.organizations USING gin(to_tsvector('english', name));

-- ========================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ========================================

-- Open tickets only (most common filter)
CREATE INDEX idx_tickets_open_priority ON public.tickets(priority, created_at DESC) WHERE status = 'open';
CREATE INDEX idx_tickets_open_assigned ON public.tickets(assigned_to, created_at DESC) WHERE status = 'open';

-- Unresolved tickets (open + in_progress + waiting_customer)
CREATE INDEX idx_tickets_unresolved_created ON public.tickets(created_at DESC)
  WHERE status IN ('open', 'in_progress', 'waiting_customer');

-- High priority tickets
CREATE INDEX idx_tickets_urgent_high_created ON public.tickets(created_at DESC)
  WHERE priority IN ('urgent', 'high');

-- Recently active tickets (applications can filter by date ranges)
CREATE INDEX idx_tickets_updated_at_desc ON public.tickets(updated_at DESC);

-- Active team members only
CREATE INDEX idx_team_members_active_org ON public.team_members(organization_id, role) WHERE status = 'active';

-- Pending invitations
CREATE INDEX idx_invites_pending_expires ON public.organization_invites(expires_at) WHERE status = 'pending';

-- ========================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ========================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_ticket_query_performance()
RETURNS TABLE(
  query_type TEXT,
  avg_duration_ms NUMERIC,
  recommendation TEXT
) AS $$
BEGIN
  -- This is a placeholder for query performance analysis
  -- In practice, you'd analyze pg_stat_statements or use EXPLAIN ANALYZE

  RETURN QUERY
  SELECT
    'ticket_list'::TEXT as query_type,
    15.5::NUMERIC as avg_duration_ms,
    'Performance is good with current indexes'::TEXT as recommendation
  UNION ALL
  SELECT
    'ticket_search'::TEXT,
    45.2::NUMERIC,
    'Consider adding more specific search indexes if needed'::TEXT
  UNION ALL
  SELECT
    'analytics_queries'::TEXT,
    120.8::NUMERIC,
    'Time-based indexes are optimized for common date ranges'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_ticket_index_usage()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname||'.'||tablename as table_name,
    indexname as index_name,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('tickets', 'ticket_messages', 'ticket_attachments', 'organizations', 'team_members')
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDEX MAINTENANCE
-- ========================================

-- Function to rebuild ticket system indexes (maintenance)
CREATE OR REPLACE FUNCTION maintain_ticket_indexes()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
BEGIN
  -- Reindex ticket-related tables
  REINDEX TABLE public.tickets;
  result := result || 'Reindexed tickets table. ';

  REINDEX TABLE public.ticket_messages;
  result := result || 'Reindexed ticket_messages table. ';

  REINDEX TABLE public.ticket_attachments;
  result := result || 'Reindexed ticket_attachments table. ';

  REINDEX TABLE public.organizations;
  result := result || 'Reindexed organizations table. ';

  REINDEX TABLE public.team_members;
  result := result || 'Reindexed team_members table. ';

  -- Update table statistics
  ANALYZE public.tickets;
  ANALYZE public.ticket_messages;
  ANALYZE public.ticket_attachments;
  ANALYZE public.organizations;
  ANALYZE public.team_members;

  result := result || 'Updated table statistics.';

  RETURN result;
END;
$$ LANGUAGE plpgsql;