CREATE OR REPLACE FUNCTION public.is_member_internal(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid() IS NULL OR auth.uid() = _uid OR public.has_role(auth.uid(), 'admin')) AND (
    public.has_role(_uid, 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND subscription_status = 'comped')
    OR EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _uid AND status IN ('active','trialing','past_due'))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_member_internal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member_internal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.free_words_used_internal(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.messages
  WHERE user_id = _uid AND status <> 'failed'
    AND (auth.uid() IS NULL OR auth.uid() = _uid OR public.has_role(auth.uid(), 'admin'))
$$;
REVOKE EXECUTE ON FUNCTION public.free_words_used_internal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.free_words_used_internal(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.my_membership()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _reason text;
  _used integer;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  IF public.has_role(_uid, 'admin') THEN _reason := 'admin';
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND subscription_status = 'comped') THEN _reason := 'comped';
  ELSIF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _uid AND status IN ('active','trialing','past_due')) THEN _reason := 'subscription';
  ELSE _reason := 'free';
  END IF;
  _used := public.free_words_used_internal(_uid);
  RETURN jsonb_build_object(
    'is_member', _reason <> 'free',
    'reason', _reason,
    'free_used', _used,
    'free_limit', 5,
    'can_send', _reason <> 'free' OR _used < 5
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.my_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_membership() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_comped(_user_id uuid, _comped boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.profiles
    SET subscription_status = CASE WHEN _comped THEN 'comped' ELSE 'free' END
    WHERE user_id = _user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_comped(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_comped(uuid, boolean) TO authenticated;