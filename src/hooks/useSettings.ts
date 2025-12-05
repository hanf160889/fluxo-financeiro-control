import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SettingsTable = 'cost_centers' | 'origins' | 'suppliers' | 'categories';

interface SettingsItem {
  id: string;
  name: string;
}

export function useSettingsData(table: SettingsTable) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as SettingsItem[];
    },
  });
}

export function useAddSettingsItem(table: SettingsTable) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ name })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Item adicionado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar: ' + error.message);
    },
  });
}

export function useUpdateSettingsItem(table: SettingsTable) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from(table)
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Item atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useDeleteSettingsItem(table: SettingsTable) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success('Item removido com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

// Users hooks
export function useUsersWithRoles() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email');
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;
      
      return profiles.map(profile => ({
        ...profile,
        role: (roles.find(r => r.user_id === profile.id)?.role || 'viewer') as 'admin' | 'editor' | 'viewer'
      }));
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'editor' | 'viewer' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Permissão atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar permissão: ' + error.message);
    },
  });
}

// Convenience hooks for specific tables
export function useSuppliers() {
  const { data, isLoading, error } = useSettingsData('suppliers');
  return { items: data || [], loading: isLoading, error };
}

export function useCategories() {
  const { data, isLoading, error } = useSettingsData('categories');
  return { items: data || [], loading: isLoading, error };
}

export function useCostCenters() {
  const { data, isLoading, error } = useSettingsData('cost_centers');
  return { items: data || [], loading: isLoading, error };
}

export function useOrigins() {
  const { data, isLoading, error } = useSettingsData('origins');
  return { items: data || [], loading: isLoading, error };
}
