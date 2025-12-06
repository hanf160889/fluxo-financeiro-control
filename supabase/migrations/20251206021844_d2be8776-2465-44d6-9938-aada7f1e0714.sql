-- Approve admin user diego.hanf@hotmail.com
UPDATE public.profiles 
SET is_approved = true 
WHERE email = 'diego.hanf@hotmail.com';