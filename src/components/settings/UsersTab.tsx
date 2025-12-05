import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsersWithRoles, useUpdateUserRole } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';

export function UsersTab() {
  const { data: users, isLoading } = useUsersWithRoles();
  const updateRole = useUpdateUserRole();
  const { user, role: currentUserRole } = useAuth();

  const isAdmin = currentUserRole === 'admin';

  const handleRoleChange = (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    updateRole.mutate({ userId, role: newRole });
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      admin: 'default',
      editor: 'secondary',
      viewer: 'outline',
    };
    const labels: Record<string, string> = {
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Visualização',
    };
    return <Badge variant={variants[role] || 'outline'}>{labels[role] || role}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários e Acessos</CardTitle>
        <CardDescription>Gerencie quem pode acessar o sistema</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users?.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum usuário cadastrado
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Permissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((userItem) => (
                <TableRow key={userItem.id}>
                  <TableCell className="font-medium">
                    {userItem.name || 'Sem nome'}
                  </TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    {isAdmin && userItem.id !== user?.id ? (
                      <Select
                        value={userItem.role}
                        onValueChange={(value) => handleRoleChange(userItem.id, value as 'admin' | 'editor' | 'viewer')}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Apenas Visualização</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(userItem.role)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
