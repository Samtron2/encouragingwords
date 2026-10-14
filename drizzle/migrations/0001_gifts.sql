CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchaser_user_id uuid,
  purchaser_name text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','redeemed','refunded')),
  redeem_token text NOT NULL UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  redeemed_at timestamptz,
  access_until timestamptz,
  redeemed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gifts_redeemed_by_idx ON public.gifts(redeemed_by);
CREATE INDEX gifts_payment_intent_idx ON public.gifts(stripe_payment_intent_id);

GRANT SELECT ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Purchasers can view their own gifts" ON public.gifts
  FOR SELECT TO authenticated USING (auth.uid() = purchaser_user_id);

CREATE OR REPLACE FUNCTION public.get_gift_preview(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('purchaser_name', purchaser_name, 'recipient_name', recipient_name, 'note', note, 'status', status)
  FROM public.gifts WHERE redeem_token = _token
$$;
GRANT EXECUTE ON FUNCTION public.get_gift_preview(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_member_internal(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NULL OR auth.uid() = _uid OR public.has_role(auth.uid(), 'admin')) AND (
    public.has_role(_uid, 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND subscription_status = 'comped')
    OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _uid AND status IN ('active','trialing','past_due'))
    OR EXISTS (SELECT 1 FROM public.gifts WHERE redeemed_by = _uid AND access_until > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.my_membership()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _reason text;
  _used integer;
  _gift_until timestamptz;
  _gift_from text;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT access_until, purchaser_name INTO _gift_until, _gift_from
    FROM public.gifts WHERE redeemed_by = _uid AND access_until > now()
    ORDER BY access_until DESC LIMIT 1;
  IF public.has_role(_uid, 'admin') THEN _reason := 'admin';
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND subscription_status = 'comped') THEN _reason := 'comped';
  ELSIF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _uid AND status IN ('active','trialing','past_due')) THEN _reason := 'subscription';
  ELSIF _gift_until IS NOT NULL THEN _reason := 'gift';
  ELSE _reason := 'free';
  END IF;
  _used := public.free_words_used_internal(_uid);
  RETURN jsonb_build_object(
    'is_member', _reason <> 'free',
    'reason', _reason,
    'free_used', _used,
    'free_limit', 5,
    'can_send', _reason <> 'free' OR _used < 5,
    'gift_access_until', _gift_until,
    'gift_from', _gift_from
  );
END;
$$;