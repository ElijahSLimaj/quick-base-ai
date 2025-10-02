-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_usage(website_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    updated_at = NOW()
  WHERE subscriptions.website_id = increment_usage.website_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;