
DROP VIEW IF EXISTS public.public_portfolio_settings;

CREATE OR REPLACE FUNCTION public.get_public_portfolio_settings(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  template text,
  accent_color text,
  headline text,
  subheadline text,
  available_for text,
  cv_url text,
  og_image_url text,
  external_portfolio_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ps.user_id,
    ps.template,
    ps.accent_color,
    ps.headline,
    ps.subheadline,
    ps.available_for,
    ps.cv_url,
    ps.og_image_url,
    ps.external_portfolio_url,
    ps.created_at,
    ps.updated_at
  FROM public.portfolio_settings ps
  WHERE ps.user_id = _user_id
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_portfolio_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio_settings(uuid) TO anon, authenticated;
