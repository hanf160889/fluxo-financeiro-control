import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Upload, Paperclip, Loader2, FileSpreadsheet, FileText, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RegisterPaidAccountModal from '@/components/forms/RegisterPaidAccountModal';
import ImportBankStatementModal from '@/components/forms/ImportBankStatementModal';
import EditPaidAccountModal from '@/components/forms/EditPaidAccountModal';
import { useAuth } from '@/contexts/AuthContext';
import { exportBankStatementToExcel, exportBankStatementToPDF } from '@/utils/bankStatementExportUtils';

interface PaidAccount {
  id: string;
  bank: string | null;
  description: string;
  category_name: string | null;
  category_id: string | null;
  supplier_id: string | null;
  document_number: string | null;
  payment_date: string | null;
  value: number;
  fine_interest: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
  cost_centers: { name: string; percentage: number }[];
}

interface CostCenter {
  id: string;
  name: string;
}

const BankStatement = () => {
  const { user, role } = useAuth();
  const [items, setItems] = useState<PaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('all');
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaidAccount | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);

  const canEdit = role === 'admin' || role === 'editor';

  useEffect(() => {
    fetchCostCenters();
    fetchItems();
  }, []);

  const fetchCostCenters = async () => {
    const { data } = await supabase.from('cost_centers').select('id, name').order('name');
    if (data) setCostCenters(data);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('accounts_payable')
        .select(`
          id,
          bank,
          description,
          document_number,
          payment_date,
          value,
          fine_interest,
          attachment_url,
          attachment_name,
          category_id,
          supplier_id,
          categories(name)
        `)
        .eq('is_paid', true)
        .order('payment_date', { ascending: false });

      if (startDate) {
        query = query.gte('payment_date', startDate);
      }
      if (endDate) {
        query = query.lte('payment_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch cost center distributions
      const ids = data?.map(d => d.id) || [];
      let costCenterData: any[] = [];
      
      if (ids.length > 0) {
        const { data: ccData } = await supabase
          .from('accounts_payable_cost_centers')
          .select('account_payable_id, percentage, cost_centers(name)')
          .in('account_payable_id', ids);
        costCenterData = ccData || [];
      }

      const mappedItems: PaidAccount[] = (data || []).map(item => ({
        id: item.id,
        bank: item.bank,
        description: item.description,
        category_name: item.categories?.name || null,
        category_id: item.category_id,
        supplier_id: item.supplier_id,
        document_number: item.document_number,
        payment_date: item.payment_date,
        value: item.value,
        fine_interest: item.fine_interest,
        attachment_url: item.attachment_url,
        attachment_name: item.attachment_name,
        cost_centers: costCenterData
          .filter(cc => cc.account_payable_id === item.id)
          .map(cc => ({
            name: cc.cost_centers?.name || '',
            percentage: cc.percentage,
          })),
      }));

      // Filter by cost center if selected
      if (costCenterFilter !== 'all') {
        const filtered = mappedItems.filter(item =>
          item.cost_centers.some(cc => cc.name === costCenterFilter)
        );
        setItems(filtered);
      } else {
        setItems(mappedItems);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [startDate, endDate, costCenterFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleViewAttachment = async (attachmentUrl: string) => {
    if (!attachmentUrl) return;
    
    setViewingAttachment(attachmentUrl);
    toast.info('Gerando link...');
    
    try {
      // Extract the fileKey from the URL (path after bucket name)
      const urlObj = new URL(attachmentUrl);
      const pathParts = urlObj.pathname.split('/');
      // Remove empty first element and bucket name, join the rest
      const bucketIndex = pathParts.findIndex(p => p.includes('financeiro'));
      const fileKey = pathParts.slice(bucketIndex + 1).join('/');
      
      console.log('Requesting signed URL for fileKey:', fileKey);
      
      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: { fileKey },
      });

      if (error) throw error;
      
      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('URL não gerada');
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast.error('Erro ao abrir comprovante');
    } finally {
      setViewingAttachment(null);
    }
  };

  const handleUploadAttachment = async (itemId: string, file: File) => {
    toast.info('Enviando arquivo...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'extratos-bancarios');

      const { data, error } = await supabase.functions.invoke('upload-to-wasabi', {
        body: formData,
      });

      if (error) throw error;

      await supabase
        .from('accounts_payable')
        .update({
          attachment_url: data.url,
          attachment_name: file.name,
        })
        .eq('id', itemId);

      toast.success('Comprovante anexado!');
      fetchItems();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao anexar comprovante');
    }
  };

  const handleImportTransactions = async (transactions: any[]) => {
    toast.info('Importando transações...');
    
    try {
      const toInsert = transactions.map(t => ({
        description: t.description,
        due_date: t.date,
        payment_date: t.date,
        value: t.value,
        is_paid: true,
        user_id: user?.id,
      }));

      const { error } = await supabase
        .from('accounts_payable')
        .insert(toInsert);

      if (error) throw error;

      toast.success(`${transactions.length} transações importadas!`);
      fetchItems();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar transações');
    }
  };

  const handleEdit = (account: PaidAccount) => {
    setEditingAccount(account);
    setEditModalOpen(true);
  };

  const handleExportExcel = () => {
    if (items.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }
    exportBankStatementToExcel(items);
    toast.success('Excel exportado!');
  };

  const handleExportPDF = () => {
    if (items.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }
    exportBankStatementToPDF(items);
    toast.success('PDF exportado!');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Extratos Bancários</h1>
            <p className="text-muted-foreground">Despesas pagas e importação de extratos</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar OFX/Excel
                </Button>
                <Button onClick={() => setRegisterModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Conta Paga
                </Button>
              </>
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Data inicial"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Data final"
                />
              </div>
              <div className="flex-1">
                <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas empresas</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.name}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contas Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma conta paga registrada
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>N° Doc</TableHead>
                      <TableHead>Data Pgto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Multa/Juros</TableHead>
                      <TableHead>Rateio</TableHead>
                      <TableHead>Comprovante</TableHead>
                      {canEdit && <TableHead>Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.bank || '-'}</TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.category_name || '-'}</TableCell>
                        <TableCell>{item.document_number || '-'}</TableCell>
                        <TableCell>{item.payment_date || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.fine_interest || 0)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {item.cost_centers.length > 0
                              ? item.cost_centers.map((cc, index) => (
                                  <div key={index}>{cc.name}: {cc.percentage}%</div>
                                ))
                              : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.attachment_url ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver comprovante"
                              onClick={() => handleViewAttachment(item.attachment_url!)}
                              disabled={viewingAttachment === item.attachment_url}
                            >
                              {viewingAttachment === item.attachment_url ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                            </Button>
                          ) : canEdit ? (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadAttachment(item.id, file);
                                }}
                              />
                              <Button variant="ghost" size="sm" asChild>
                                <span>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Anexar
                                </span>
                              </Button>
                            </label>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RegisterPaidAccountModal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        onSave={fetchItems}
      />

      <ImportBankStatementModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImportTransactions}
      />

      <EditPaidAccountModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSave={fetchItems}
        account={editingAccount}
      />
    </AppLayout>
  );
};

export default BankStatement;
