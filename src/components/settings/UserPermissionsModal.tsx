import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateUserPermissions, AVAILABLE_PAGES, UserWithPermissions } from '@/hooks/useUserPermissions';

interface UserPermissionsModalProps {
  user: UserWithPermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPermissionsModal({ user, open, onOpenChange }: UserPermissionsModalProps) {
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const updatePermissions = useUpdateUserPermissions();

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setSelectedPages(user.page_permissions);
    }
  }, [user]);

  const handlePageToggle = (pagePath: string, checked: boolean) => {
    if (checked) {
      setSelectedPages(prev => [...prev, pagePath]);
    } else {
      setSelectedPages(prev => prev.filter(p => p !== pagePath));
    }
  };

  const handleSelectAll = () => {
    setSelectedPages(AVAILABLE_PAGES.map(p => p.path));
  };

  const handleDeselectAll = () => {
    setSelectedPages([]);
  };

  const handleSave = () => {
    if (!user) return;
    
    updatePermissions.mutate({
      userId: user.id,
      role,
      pagePermissions: selectedPages
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Permissões</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <p className="text-sm text-muted-foreground">{user.name || user.email}</p>
          </div>

          <div className="space-y-2">
            <Label>Nível de Acesso</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'admin' | 'editor' | 'viewer')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Apenas Visualização</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'admin' && 'Acesso total ao sistema, incluindo gerenciamento de usuários'}
              {role === 'editor' && 'Pode criar e editar registros, mas não excluir'}
              {role === 'viewer' && 'Pode apenas visualizar informações'}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Páginas Permitidas</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  Nenhuma
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 rounded-lg border border-border p-3">
              {AVAILABLE_PAGES.map((page) => (
                <div key={page.path} className="flex items-center space-x-2">
                  <Checkbox
                    id={page.path}
                    checked={selectedPages.includes(page.path)}
                    onCheckedChange={(checked) => handlePageToggle(page.path, !!checked)}
                  />
                  <label
                    htmlFor={page.path}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {page.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updatePermissions.isPending}>
            {updatePermissions.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
