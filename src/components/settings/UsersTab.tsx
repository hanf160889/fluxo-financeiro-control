import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsersWithPermissions, useApproveUser, UserWithPermissions } from '@/hooks/useUserPermissions';
import { UserPermissionsModal } from './UserPermissionsModal';

export function UsersTab() {
  const { data: users, isLoading } = useUsersWithPermissions();
  const approveUser = useApproveUser();
  const { user, role: currentUserRole } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  const isAdmin = currentUserRole === 'admin';

  const handleApprove = (userId: string) => {
    approveUser.mutate({ userId, approve: true });
  };

  const handleRevoke = (userId: string) => {
    approveUser.mutate({ userId, approve: false });
  };

  const handleConfigurePermissions = (userItem: UserWithPermissions) => {
    setSelectedUser(userItem);
    setPermissionsModalOpen(true);
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

  const getStatusBadge = (isApproved: boolean) => {
    if (isApproved) {
      return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
    }
    return <Badge variant="destructive">Pendente</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Usuários e Acessos</CardTitle>
          <CardDescription>Gerencie quem pode acessar o sistema e suas permissões</CardDescription>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Permissão</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell className="font-medium">
                      {userItem.name || 'Sem nome'}
                    </TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>{getStatusBadge(userItem.is_approved)}</TableCell>
                    <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {userItem.id !== user?.id && (
                            <>
                              {!userItem.is_approved ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(userItem.id)}
                                  disabled={approveUser.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRevoke(userItem.id)}
                                  disabled={approveUser.isPending}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Revogar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfigurePermissions(userItem)}
                              >
                                <Settings2 className="h-4 w-4 mr-1" />
                                Permissões
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserPermissionsModal
        user={selectedUser}
        open={permissionsModalOpen}
        onOpenChange={setPermissionsModalOpen}
      />
    </>
  );
}
