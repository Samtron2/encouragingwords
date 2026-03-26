
CREATE POLICY "Admins can delete recipients"
ON public.recipients
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all recipients"
ON public.recipients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
