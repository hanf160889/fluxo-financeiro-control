import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, FileText, Check, Pencil, Paperclip, Trash2, Loader2 } from 'lucide-react';
import NewAccountPayableModal from '@/components/forms/NewAccountPayableModal';
import EditAccountPayableModal from '@/components/forms/EditAccountPayableModal';
import { useAccountsPayable, AccountPayable } from '@/hooks/useAccountsPayable';
import { useCategories } from '@/hooks/useSettings';
import { useAuth } from '@/contexts/AuthContext';
import { exportToExcel, exportToPDF } from '@/utils/exportUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AccountsPayablePage = () => {
  const { items, loading, fetchItems, addItem, markAsPaid, deleteItem } = useAccountsPayable();
  const { items: categories } = useCategories();
  const { role } = useAuth();
  
  const [filterCategory, setFilterCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<AccountPayable | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [itemToPay, setItemToPay] = useState<string | null>(null);

  const canEdit = role === 'admin' || role === 'editor';
  const canDelete = role === 'admin';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleFilter = () => {
    fetchItems(startDate || undefined, endDate || undefined, filterCategory);
  };

  const handleMarkAsPaid = (id: string) => {
    setItemToPay(id);
    setPayDialogOpen(true);
  };

  const confirmMarkAsPaid = () => {
    if (itemToPay) {
      markAsPaid(itemToPay, new Date().toISOString().split('T')[0]);
      setPayDialogOpen(false);
      setItemToPay(null);
    }
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleEdit = (item: AccountPayable) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleViewAttachment = async (url: string) => {
    try {
      // Extract the file key from the URL
      const urlObj = new URL(url);
      const fileKey = urlObj.pathname.substring(1); // Remove leading slash
      
      toast.loading('Carregando comprovante...', { id: 'loading-attachment' });
      
      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: { fileKey },
      });
      
      toast.dismiss('loading-attachment');
      
      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao gerar URL');
      }
      
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast.error('Erro ao abrir comprovante');
    }
  };

  const handleExportExcel = () => {
    const dateRange = startDate || endDate 
      ? `_${startDate || 'inicio'}_${endDate || 'fim'}` 
      : '';
    exportToExcel(items, `contas-a-pagar${dateRange}`);
  };

  const handleExportPDF = () => {
    const dateRange = startDate || endDate 
      ? `_${startDate || 'inicio'}_${endDate || 'fim'}` 
      : '';
    exportToPDF(items, `contas-a-pagar${dateRange}`);
  };

  const getInstallmentText = (item: AccountPayable) => {
    if (item.total_installments && item.total_installments > 1) {
      return `${item.current_installment} de ${item.total_installments}`;
    }
    return '-';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas pendentes</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            {canEdit && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Pagar
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input 
                  type="date" 
                  placeholder="Data inicial" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input 
                  type="date" 
                  placeholder="Data final"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleFilter}>Filtrar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma conta pendente
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>N° Doc</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.supplier?.name || '-'}</TableCell>
                        <TableCell>{item.category?.name || '-'}</TableCell>
                        <TableCell>{item.document_number || '-'}</TableCell>
                        <TableCell>{formatDate(item.due_date)}</TableCell>
                        <TableCell>{getInstallmentText(item)}</TableCell>
                        <TableCell>{item.payment_date ? formatDate(item.payment_date) : '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_paid ? 'default' : 'destructive'}>
                            {item.is_paid ? 'Paga' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!item.is_paid && canEdit && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Marcar como paga"
                                onClick={() => handleMarkAsPaid(item.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Editar"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {item.attachment_url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Ver comprovante"
                                onClick={() => handleViewAttachment(item.attachment_url!)}
                              >
                                <Paperclip className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Excluir"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <NewAccountPayableModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen}
          onSubmit={addItem}
        />

        <EditAccountPayableModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          item={itemToEdit}
          onSave={() => fetchItems()}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pay Confirmation Dialog */}
        <AlertDialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja marcar esta conta como paga com a data de hoje?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmMarkAsPaid}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AccountsPayablePage;
