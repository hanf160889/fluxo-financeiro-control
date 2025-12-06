import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AccountReceivableOrigin {
  id: string;
  origin_id: string;
  value: number;
  origin?: {
    id: string;
    name: string;
  };
}

export interface AccountReceivable {
  id: string;
  user_id: string;
  description: string;
  survey_date: string;
  total_value: number;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
  origins?: AccountReceivableOrigin[];
}

export interface AccountReceivableInput {
  description: string;
  survey_date: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  origins: { origin_id: string; value: number }[];
}

export const useAccountsReceivable = () => {
  const [items, setItems] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async (startDate?: string, endDate?: string, originId?: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('accounts_receivable')
        .select(`
          *,
          origins:accounts_receivable_origins(
            id,
            origin_id,
            value,
            origin:origins(id, name)
          )
        `)
        .order('survey_date', { ascending: false });

      if (startDate) {
        query = query.gte('survey_date', startDate);
      }
      if (endDate) {
        query = query.lte('survey_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      
      // Filter by origin if specified
      if (originId && originId !== 'all') {
        filteredData = filteredData.filter(item => 
          item.origins?.some((o: AccountReceivableOrigin) => o.origin_id === originId)
        );
      }

      setItems(filteredData as AccountReceivable[]);
    } catch (error: any) {
      console.error('Error fetching accounts receivable:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (input: AccountReceivableInput) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const totalValue = input.origins.reduce((sum, o) => sum + o.value, 0);

      const { data, error } = await supabase
        .from('accounts_receivable')
        .insert({
          user_id: userData.user.id,
          description: input.description,
          survey_date: input.survey_date,
          total_value: totalValue,
          attachment_url: input.attachment_url,
          attachment_name: input.attachment_name,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert origins
      if (input.origins.length > 0) {
        const originsData = input.origins.map(o => ({
          account_receivable_id: data.id,
          origin_id: o.origin_id,
          value: o.value,
        }));

        const { error: originsError } = await supabase
          .from('accounts_receivable_origins')
          .insert(originsData);

        if (originsError) throw originsError;
      }

      toast({
        title: "Sucesso",
        description: "Conta a receber cadastrada com sucesso",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error adding account receivable:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conta a receber excluída com sucesso",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error deleting account receivable:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteMultiple = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${ids.length} conta(s) excluída(s) com sucesso`,
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error deleting accounts receivable:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAttachment = async (id: string, attachmentUrl: string | null, attachmentName: string | null) => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .update({
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Comprovante atualizado com sucesso",
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error updating attachment:', error);
      toast({
        title: "Erro ao atualizar comprovante",
        description: error.message,
        variant: "destructive",
      });
      return false;
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
    deleteItem,
    deleteMultiple,
    updateAttachment,
  };
};
