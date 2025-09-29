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
  project_id uuid,
  source_url text NOT NULL,
  content text NOT NULL,
  chunked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_pkey PRIMARY KEY (id),
  CONSTRAINT content_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL,
  owner_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  settings jsonb DEFAULT '{}'::jsonb,
  stripe_customer_id text,
  subscription_id text,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.queries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid,
  question text NOT NULL,
  answer text NOT NULL,
  confidence numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT queries_pkey PRIMARY KEY (id),
  CONSTRAINT queries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
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
  project_id uuid,
  plan text NOT NULL,
  status text NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);