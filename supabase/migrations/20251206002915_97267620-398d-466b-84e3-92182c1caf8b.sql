-- Create accounts_receivable table
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  survey_date DATE NOT NULL,
  total_value NUMERIC NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accounts_receivable_origins junction table
CREATE TABLE public.accounts_receivable_origins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_receivable_id UUID NOT NULL REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  origin_id UUID NOT NULL REFERENCES public.origins(id),
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable_origins ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts_receivable
CREATE POLICY "Authenticated users can view accounts receivable"
ON public.accounts_receivable
FOR SELECT
USING (true);

CREATE POLICY "Admins and editors can insert accounts receivable"
ON public.accounts_receivable
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update accounts receivable"
ON public.accounts_receivable
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete accounts receivable"
ON public.accounts_receivable
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for accounts_receivable_origins
CREATE POLICY "Authenticated users can view accounts receivable origins"
ON public.accounts_receivable_origins
FOR SELECT
USING (true);

CREATE POLICY "Admins and editors can insert accounts receivable origins"
ON public.accounts_receivable_origins
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update accounts receivable origins"
ON public.accounts_receivable_origins
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete accounts receivable origins"
ON public.accounts_receivable_origins
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_accounts_receivable_updated_at
BEFORE UPDATE ON public.accounts_receivable
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();