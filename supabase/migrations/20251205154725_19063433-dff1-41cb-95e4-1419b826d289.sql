-- Create accounts_payable table
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  document_number TEXT,
  due_date DATE NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  total_installments INTEGER,
  current_installment INTEGER,
  payment_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for cost center distribution
CREATE TABLE public.accounts_payable_cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_payable_id UUID NOT NULL REFERENCES public.accounts_payable(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_payable_id, cost_center_id)
);

-- Enable RLS
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable_cost_centers ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts_payable
CREATE POLICY "Authenticated users can view accounts payable"
ON public.accounts_payable FOR SELECT
USING (true);

CREATE POLICY "Admins and editors can insert accounts payable"
ON public.accounts_payable FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update accounts payable"
ON public.accounts_payable FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete accounts payable"
ON public.accounts_payable FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for accounts_payable_cost_centers
CREATE POLICY "Authenticated users can view cost center distribution"
ON public.accounts_payable_cost_centers FOR SELECT
USING (true);

CREATE POLICY "Admins and editors can insert cost center distribution"
ON public.accounts_payable_cost_centers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update cost center distribution"
ON public.accounts_payable_cost_centers FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete cost center distribution"
ON public.accounts_payable_cost_centers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_accounts_payable_updated_at
BEFORE UPDATE ON public.accounts_payable
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();