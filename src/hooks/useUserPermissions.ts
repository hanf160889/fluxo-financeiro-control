import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserWithPermissions {
  id: string;
  name: string | null;
  email: string | null;
  is_approved: boolean;
  role: 'admin' | 'editor' | 'viewer';
  page_permissions: string[];
}

export const AVAILABLE_PAGES = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/contas-pagar', label: 'Contas a Pagar' },
  { path: '/extrato-bancario', label: 'Extrato Bancário' },
  { path: '/contas-receber', label: 'Contas a Receber' },
  { path: '/banco-notas', label: 'Banco de Notas' },
  { path: '/configuracoes', label: 'Configurações' },
];

export function useUsersWithPermissions() {
  return useQuery({
    queryKey: ['users-with-permissions'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, is_approved');
      
      if (profilesError) throw profilesError;
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const { data: permissions, error: permissionsError } = await supabase
        .from('user_page_permissions')
        .select('user_id, page_path');
      
      if (permissionsError) throw permissionsError;
      
      return profiles.map(profile => {
        const userPermissions = permissions
          .filter(p => p.user_id === profile.id)
          .map(p => p.page_path);
        
        return {
          ...profile,
          role: (roles.find(r => r.user_id === profile.id)?.role || 'viewer') as 'admin' | 'editor' | 'viewer',
          page_permissions: userPermissions.length > 0 ? userPermissions : AVAILABLE_PAGES.map(p => p.path)
        };
      }) as UserWithPermissions[];
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approve })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, { approve }) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast.success(approve ? 'Usuário aprovado com sucesso' : 'Acesso do usuário revogado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role, pagePermissions }: { 
      userId: string; 
      role: 'admin' | 'editor' | 'viewer';
      pagePermissions: string[];
    }) => {
      // Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      
      if (roleError) throw roleError;

      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('user_page_permissions')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // Insert new permissions
      if (pagePermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('user_page_permissions')
          .insert(pagePermissions.map(path => ({
            user_id: userId,
            page_path: path
          })));
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast.success('Permissões atualizadas com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar permissões: ' + error.message);
    },
  });
}

export function useCurrentUserPermissions() {
  return useQuery({
    queryKey: ['current-user-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: permissions } = await supabase
        .from('user_page_permissions')
        .select('page_path')
        .eq('user_id', user.id);
      
      // If no permissions set, allow all pages
      if (!permissions || permissions.length === 0) {
        return AVAILABLE_PAGES.map(p => p.path);
      }

      return permissions.map(p => p.page_path);
    },
  });
}
