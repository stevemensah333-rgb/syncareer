-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'premium')) DEFAULT 'free',
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trial')) DEFAULT 'active',
  billing_provider text NOT NULL CHECK (billing_provider IN ('stripe', 'momo')) DEFAULT 'stripe',
  subscription_id text,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  auto_renew boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id) -- One subscription per user
);

-- Create subscription_events table for audit logging
CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create stripe_customers mapping table
CREATE TABLE public.stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- Create stripe_webhooks table for idempotency checking
CREATE TABLE public.stripe_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create checkout_sessions table for tracking payment sessions
CREATE TABLE public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  plan_type text NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  payment_method text NOT NULL CHECK (payment_method IN ('stripe', 'momo')),
  status text DEFAULT 'pending',
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- === SUBSCRIPTIONS TABLE RLS POLICIES ===

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all subscriptions
CREATE POLICY "Admins can read all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can update subscriptions (via webhooks)
CREATE POLICY "Service role can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (auth.role() = 'service_role');

-- Service role can insert subscriptions
CREATE POLICY "Service role can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- === SUBSCRIPTION_EVENTS TABLE RLS POLICIES ===

-- Users can read events for their own subscription
CREATE POLICY "Users can read own subscription events"
ON public.subscription_events
FOR SELECT
USING (
  subscription_id IN (
    SELECT id FROM public.subscriptions 
    WHERE user_id = auth.uid()
  )
);

-- Admins can read all events
CREATE POLICY "Admins can read all subscription events"
ON public.subscription_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert events
CREATE POLICY "Service role can insert subscription events"
ON public.subscription_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- === STRIPE_CUSTOMERS TABLE RLS POLICIES ===

-- Users can read their own stripe customer mapping
CREATE POLICY "Users can read own stripe customer"
ON public.stripe_customers
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage stripe customers
CREATE POLICY "Service role can manage stripe customers"
ON public.stripe_customers
FOR ALL
USING (auth.role() = 'service_role');

-- === STRIPE_WEBHOOKS TABLE RLS POLICIES ===

-- Service role can manage webhook records
CREATE POLICY "Service role can manage webhooks"
ON public.stripe_webhooks
FOR ALL
USING (auth.role() = 'service_role');

-- Admins can read webhook logs
CREATE POLICY "Admins can read webhook logs"
ON public.stripe_webhooks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- === CHECKOUT_SESSIONS TABLE RLS POLICIES ===

-- Users can read their own checkout sessions
CREATE POLICY "Users can read own checkout sessions"
ON public.checkout_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own checkout sessions
CREATE POLICY "Users can insert own checkout sessions"
ON public.checkout_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update checkout sessions
CREATE POLICY "Service role can update checkout sessions"
ON public.checkout_sessions
FOR UPDATE
USING (auth.role() = 'service_role');

-- === CREATE INDEXES FOR PERFORMANCE ===

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_plan_type ON public.subscriptions(plan_type);
CREATE INDEX idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events(created_at DESC);
CREATE INDEX idx_stripe_customers_user_id ON public.stripe_customers(user_id);
CREATE INDEX idx_stripe_webhooks_stripe_event_id ON public.stripe_webhooks(stripe_event_id);
CREATE INDEX idx_stripe_webhooks_created_at ON public.stripe_webhooks(created_at DESC);
CREATE INDEX idx_checkout_sessions_user_id ON public.checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_stripe_session_id ON public.checkout_sessions(stripe_session_id);

-- === CREATE TRIGGER FOR updated_at ===

CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at_trigger
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION public.update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checkout_sessions_updated_at_trigger
BEFORE UPDATE ON public.checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_checkout_sessions_updated_at();

-- === DEFAULT SUBSCRIPTION FOR EXISTING USERS ===
-- Create free subscriptions for users who don't have one
INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT id, 'free', 'active' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT DO NOTHING;
