-- Create notifications table for real-time ticket assignment notifications
-- This table stores notifications for users when tickets are assigned to them

CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User who receives the notification
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Organization context (for filtering)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  
  -- Related entity (optional)
  entity_type TEXT, -- 'ticket', 'organization_invite', etc.
  entity_id UUID,   -- ID of the related entity
  
  -- Notification metadata
  data JSONB DEFAULT '{}', -- Additional data like ticket details, etc.
  
  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Expiry (notifications older than this can be auto-deleted)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON public.notifications(entity_type, entity_id);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update read status of their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications for any user
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Function to create ticket assignment notification
CREATE OR REPLACE FUNCTION create_ticket_assignment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    INSERT INTO public.notifications (
      user_id,
      organization_id,
      title,
      message,
      type,
      entity_type,
      entity_id,
      data
    ) VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'New Ticket Assignment',
      'You have been assigned to ticket #' || NEW.ticket_number || ': ' || NEW.title,
      'info',
      'ticket',
      NEW.id,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'ticket_number', NEW.ticket_number,
        'ticket_title', NEW.title,
        'priority', NEW.priority,
        'customer_email', NEW.customer_email,
        'customer_name', NEW.customer_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create notifications when tickets are assigned
CREATE TRIGGER trigger_ticket_assignment_notification
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_assignment_notification();

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
