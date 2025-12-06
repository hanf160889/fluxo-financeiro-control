import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountPayable {
  id: string;
  user_id: string;
  description: string;
  supplier_id: string | null;
  category_id: string | null;
  document_number: string | null;
  due_date: string;
  value: number;
  is_recurring: boolean;
  total_installments: number | null;
  current_installment: number | null;
  payment_date: string | null;
  is_paid: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  supplier?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  cost_centers?: { cost_center_id: string; percentage: number; cost_center?: { id: string; name: string } }[];
}

export interface AccountPayableInput {
  description: string;
  supplier_id: string | null;
  category_id: string | null;
  document_number: string | null;
  due_date: string;
  value: number;
  is_recurring: boolean;
  total_installments: number | null;
  current_installment: number | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  cost_centers: { cost_center_id: string; percentage: number }[];
}

export function useAccountsPayable() {
  const [items, setItems] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async (startDate?: string, endDate?: string, supplierId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('accounts_payable')
        .select(`
          *,
          supplier:suppliers(id, name),
          category:categories(id, name),
          cost_centers:accounts_payable_cost_centers(
            cost_center_id,
            percentage,
            cost_center:cost_centers(id, name)
          )
        `)
        .order('due_date', { ascending: true });

      if (startDate) {
        query = query.gte('due_date', startDate);
      }
      if (endDate) {
        query = query.lte('due_date', endDate);
      }
      if (supplierId && supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar contas a pagar');
      console.error('Error fetching accounts payable:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (input: AccountPayableInput) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { cost_centers, ...accountData } = input;

      // If recurring, create multiple installments
      if (input.is_recurring && input.total_installments && input.total_installments > 1) {
        const baseDate = new Date(input.due_date);
        
        for (let i = 0; i < input.total_installments; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);

          const { data: newAccount, error: accountError } = await supabase
            .from('accounts_payable')
            .insert({
              ...accountData,
              user_id: userData.user.id,
              due_date: installmentDate.toISOString().split('T')[0],
              current_installment: i + 1,
            })
            .select()
            .single();

          if (accountError) throw accountError;

          // Insert cost center distribution
          if (cost_centers.length > 0) {
            const costCenterInserts = cost_centers.map(cc => ({
              account_payable_id: newAccount.id,
              cost_center_id: cc.cost_center_id,
              percentage: cc.percentage,
            }));

            const { error: ccError } = await supabase
              .from('accounts_payable_cost_centers')
              .insert(costCenterInserts);

            if (ccError) throw ccError;
          }
        }
      } else {
        // Single payment
        const { data: newAccount, error: accountError } = await supabase
          .from('accounts_payable')
          .insert({
            ...accountData,
            user_id: userData.user.id,
            current_installment: 1,
            total_installments: 1,
          })
          .select()
          .single();

        if (accountError) throw accountError;

        // Insert cost center distribution
        if (cost_centers.length > 0) {
          const costCenterInserts = cost_centers.map(cc => ({
            account_payable_id: newAccount.id,
            cost_center_id: cc.cost_center_id,
            percentage: cc.percentage,
          }));

          const { error: ccError } = await supabase
            .from('accounts_payable_cost_centers')
            .insert(costCenterInserts);

          if (ccError) throw ccError;
        }
      }

      toast.success('Conta a pagar registrada com sucesso!');
      fetchItems();
      return true;
    } catch (error: any) {
      toast.error('Erro ao registrar conta a pagar');
      console.error('Error adding account payable:', error);
      return false;
    }
  };

  const markAsPaid = async (id: string, paymentDate: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({ is_paid: true, payment_date: paymentDate })
        .eq('id', id);

      if (error) throw error;
      toast.success('Conta marcada como paga!');
      fetchItems();
    } catch (error: any) {
      toast.error('Erro ao marcar conta como paga');
      console.error('Error marking as paid:', error);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Conta excluída com sucesso!');
      fetchItems();
    } catch (error: any) {
      toast.error('Erro ao excluir conta');
      console.error('Error deleting account payable:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    fetchItems,
    addItem,
    markAsPaid,
    deleteItem,
  };
}
