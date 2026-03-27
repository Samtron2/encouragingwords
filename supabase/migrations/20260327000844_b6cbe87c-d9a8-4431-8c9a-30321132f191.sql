
-- Delete messages first (references recipients)
DELETE FROM public.messages;

-- Delete recipients
DELETE FROM public.recipients;

-- Delete profiles except sam
DELETE FROM public.profiles WHERE email IS DISTINCT FROM 'sam@devinemediamn.com';

-- Delete auth.users except sam
DELETE FROM auth.users WHERE email IS DISTINCT FROM 'sam@devinemediamn.com';
