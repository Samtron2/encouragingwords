ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_delivery_method_check;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_delivery_method_check CHECK (delivery_method IN ('email', 'sms', 'sms_native'));
ALTER TABLE public.messages ADD CONSTRAINT messages_status_check CHECK (status IN ('sent', 'failed', 'initiated'));