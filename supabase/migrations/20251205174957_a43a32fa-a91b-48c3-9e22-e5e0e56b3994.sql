-- Add bank and fine_interest columns to accounts_payable
ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS bank TEXT,
ADD COLUMN IF NOT EXISTS fine_interest NUMERIC DEFAULT 0;

-- Create banks settings table
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for banks
CREATE POLICY "Authenticated users can view banks" 
ON public.banks 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and editors can insert banks" 
ON public.banks 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update banks" 
ON public.banks 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete banks" 
ON public.banks 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_banks_updated_at
BEFORE UPDATE ON public.banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default banks
INSERT INTO public.banks (name) VALUES 
  ('Banco do Brasil'),
  ('Itaú'),
  ('Bradesco'),
  ('Santander'),
  ('Caixa Econômica Federal'),
  ('Nubank'),
  ('Inter'),
  ('Sicoob'),
  ('Sicredi');