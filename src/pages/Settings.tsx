import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsListCard } from '@/components/settings/SettingsListCard';
import { UsersTab } from '@/components/settings/UsersTab';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSettingsData,
  useAddSettingsItem,
  useUpdateSettingsItem,
  useDeleteSettingsItem,
} from '@/hooks/useSettings';

const Settings = () => {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'editor';
  const canDelete = role === 'admin';

  // Cost Centers
  const { data: costCenters, isLoading: loadingCostCenters } = useSettingsData('cost_centers');
  const addCostCenter = useAddSettingsItem('cost_centers');
  const updateCostCenter = useUpdateSettingsItem('cost_centers');
  const deleteCostCenter = useDeleteSettingsItem('cost_centers');

  // Origins
  const { data: origins, isLoading: loadingOrigins } = useSettingsData('origins');
  const addOrigin = useAddSettingsItem('origins');
  const updateOrigin = useUpdateSettingsItem('origins');
  const deleteOrigin = useDeleteSettingsItem('origins');

  // Suppliers
  const { data: suppliers, isLoading: loadingSuppliers } = useSettingsData('suppliers');
  const addSupplier = useAddSettingsItem('suppliers');
  const updateSupplier = useUpdateSettingsItem('suppliers');
  const deleteSupplier = useDeleteSettingsItem('suppliers');

  // Categories
  const { data: categories, isLoading: loadingCategories } = useSettingsData('categories');
  const addCategory = useAddSettingsItem('categories');
  const updateCategory = useUpdateSettingsItem('categories');
  const deleteCategory = useDeleteSettingsItem('categories');

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
            <SettingsListCard
              title="Centros de Custo"
              placeholder="Nome do centro de custo"
              items={costCenters}
              isLoading={loadingCostCenters}
              onAdd={(name) => addCostCenter.mutate(name)}
              onUpdate={(id, name) => updateCostCenter.mutate({ id, name })}
              onDelete={(id) => deleteCostCenter.mutate(id)}
              isAdding={addCostCenter.isPending}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </TabsContent>

          <TabsContent value="origins" className="mt-6">
            <SettingsListCard
              title="Origens de Contas a Receber"
              placeholder="Nome da origem"
              items={origins}
              isLoading={loadingOrigins}
              onAdd={(name) => addOrigin.mutate(name)}
              onUpdate={(id, name) => updateOrigin.mutate({ id, name })}
              onDelete={(id) => deleteOrigin.mutate(id)}
              isAdding={addOrigin.isPending}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-6">
            <SettingsListCard
              title="Fornecedores"
              placeholder="Nome do fornecedor"
              items={suppliers}
              isLoading={loadingSuppliers}
              onAdd={(name) => addSupplier.mutate(name)}
              onUpdate={(id, name) => updateSupplier.mutate({ id, name })}
              onDelete={(id) => deleteSupplier.mutate(id)}
              isAdding={addSupplier.isPending}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-6">
            <SettingsListCard
              title="Categorias de Despesas"
              placeholder="Nome da categoria"
              items={categories}
              isLoading={loadingCategories}
              onAdd={(name) => addCategory.mutate(name)}
              onUpdate={(id, name) => updateCategory.mutate({ id, name })}
              onDelete={(id) => deleteCategory.mutate(id)}
              isAdding={addCategory.isPending}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;
