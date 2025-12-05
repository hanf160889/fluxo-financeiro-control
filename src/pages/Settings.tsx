import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil } from 'lucide-react';

const mockCostCenters = [
  { id: '1', name: 'Empresa 1' },
  { id: '2', name: 'Empresa 2' },
];

const mockOrigins = [
  { id: '1', name: 'Vendas Loja' },
  { id: '2', name: 'Consultoria' },
  { id: '3', name: 'Serviços' },
];

const mockSuppliers = [
  { id: '1', name: 'Imobiliária XYZ' },
  { id: '2', name: 'Materiais ABC' },
  { id: '3', name: 'Serviços Gerais' },
];

const mockCategories = [
  { id: '1', name: 'Aluguel' },
  { id: '2', name: 'Materiais' },
  { id: '3', name: 'Utilidades' },
  { id: '4', name: 'Serviços' },
];

const mockUsers = [
  { id: '1', name: 'Admin', email: 'admin@empresa.com', role: 'admin' },
  { id: '2', name: 'Editor', email: 'editor@empresa.com', role: 'editor' },
  { id: '3', name: 'Visualizador', email: 'viewer@empresa.com', role: 'viewer' },
];

const Settings = () => {
  const [newCostCenter, setNewCostCenter] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const renderSimpleList = (
    title: string,
    items: { id: string; name: string }[],
    newValue: string,
    setNewValue: (value: string) => void,
    placeholder: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span>{item.name}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configure as informações base do sistema</p>
        </div>

        <Tabs defaultValue="cost-centers" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cost-centers">Centros de Custo</TabsTrigger>
            <TabsTrigger value="origins">Origens</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="cost-centers" className="mt-6">
            {renderSimpleList(
              'Centros de Custo',
              mockCostCenters,
              newCostCenter,
              setNewCostCenter,
              'Nome do centro de custo'
            )}
          </TabsContent>

          <TabsContent value="origins" className="mt-6">
            {renderSimpleList(
              'Origens de Contas a Receber',
              mockOrigins,
              newOrigin,
              setNewOrigin,
              'Nome da origem'
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="mt-6">
            {renderSimpleList(
              'Fornecedores',
              mockSuppliers,
              newSupplier,
              setNewSupplier,
              'Nome do fornecedor'
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            {renderSimpleList(
              'Categorias de Despesas',
              mockCategories,
              newCategory,
              setNewCategory,
              'Nome da categoria'
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuários e Acessos</CardTitle>
                <CardDescription>Gerencie quem pode acessar o sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="E-mail do usuário" className="flex-1" />
                  <Select defaultValue="viewer">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Permissão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Apenas Visualização</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Convidar
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Administrador' : 
                             user.role === 'editor' ? 'Editor' : 'Visualização'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
