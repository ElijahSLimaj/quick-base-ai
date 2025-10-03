-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_id uuid,
  text text NOT NULL,
  embedding USER-DEFINED,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chunks_pkey PRIMARY KEY (id),
  CONSTRAINT chunks_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content(id)
);
CREATE TABLE public.content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid,
  source_url text NOT NULL,
  content text NOT NULL,
  chunked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  site_url text,
  last_crawled_at timestamp with time zone,
  next_crawl_at timestamp with time zone,
  crawl_frequency interval DEFAULT '30 days'::interval,
  auto_crawl_enabled boolean DEFAULT true,
  pages_count integer DEFAULT 1,
  CONSTRAINT content_pkey PRIMARY KEY (id),
  CONSTRAINT content_project_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.crawl_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  site_url text NOT NULL,
  job_type text NOT NULL CHECK (job_type = ANY (ARRAY['auto'::text, 'manual'::text])),
  scheduled_at timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])),
  pages_crawled integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crawl_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT crawl_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.websites(id)
);
CREATE TABLE public.queries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid,
  question text NOT NULL,
  answer text NOT NULL,
  confidence numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT queries_pkey PRIMARY KEY (id),
  CONSTRAINT queries_project_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.query_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  query_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT query_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT query_feedback_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.queries(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  website_id uuid,
  plan text NOT NULL,
  status text NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  plan_type text NOT NULL DEFAULT 'free'::text,
  sites_limit integer DEFAULT 1,
  answers_limit integer DEFAULT 500,
  crawls_limit integer DEFAULT 1,
  manual_recrawls_limit integer DEFAULT 2,
  auto_crawl_enabled boolean DEFAULT false,
  current_period_start timestamp with time zone DEFAULT now(),
  current_period_end timestamp with time zone DEFAULT (now() + '1 mon'::interval),
  trial_ends_at timestamp with time zone,
  trial_started_at timestamp with time zone,
  stripe_subscription_id text,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_project_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id)
);
CREATE TABLE public.usage_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  answers_used integer DEFAULT 0,
  crawls_used integer DEFAULT 0,
  manual_recrawls_used integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usage_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT usage_tracking_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.websites(id)
);
CREATE TABLE public.websites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  stripe_customer_id text,
  subscription_id text,
  sites jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT websites_pkey PRIMARY KEY (id),
  CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);