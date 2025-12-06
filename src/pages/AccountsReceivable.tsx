import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileSpreadsheet, FileText, Trash2, Search, X, Upload } from 'lucide-react';
import NewAccountReceivableModal from '@/components/forms/NewAccountReceivableModal';
import { useAccountsReceivable, AccountReceivable } from '@/hooks/useAccountsReceivable';
import { useOrigins } from '@/hooks/useOrigins';
import { useAuth } from '@/contexts/AuthContext';
import { exportReceivablesToExcel, exportReceivablesToPDF } from '@/utils/exportReceivablesUtils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AccountsReceivable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  const { items, loading, fetchItems, addItem, deleteMultiple, updateAttachment } = useAccountsReceivable();
  const { origins } = useOrigins();
  const { role } = useAuth();
  const { toast } = useToast();

  const hasActiveFilters = startDate || endDate || filterOrigin !== 'all';

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
    fetchItems(startDate || undefined, endDate || undefined, filterOrigin);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterOrigin('all');
    fetchItems();
  };

  const handleExportExcel = () => {
    exportReceivablesToExcel(items);
    toast({
      title: "Exportando Excel",
      description: "Download iniciado...",
    });
  };

  const handleExportPDF = () => {
    exportReceivablesToPDF(items);
    toast({
      title: "Exportando PDF",
      description: "Download iniciado...",
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    }
  };

  const handleDeleteSelected = async () => {
    await deleteMultiple(selectedItems);
    setSelectedItems([]);
    setShowDeleteDialog(false);
  };

  const handleSaveNew = async (data: {
    description: string;
    survey_date: string;
    attachment_url?: string | null;
    attachment_name?: string | null;
    origins: { origin_id: string; value: number }[];
  }) => {
    return await addItem(data);
  };

  const handleUploadAttachment = async (item: AccountReceivable, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingId(item.id);
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'receivables');

        const { data, error } = await supabase.functions.invoke('upload-to-wasabi', {
          body: formData,
        });

        if (error) throw error;

        await updateAttachment(item.id, data.url, file.name);
      } catch (error: any) {
        console.error('Error uploading file:', error);
        toast({
          title: "Erro ao enviar arquivo",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setUploadingId(null);
      }
    }
  };

  const handleDownloadAttachment = async (item: AccountReceivable) => {
    if (!item.attachment_url) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-signed-url', {
        body: { url: item.attachment_url },
      });

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error getting signed URL:', error);
      toast({
        title: "Erro ao baixar arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOriginsDisplay = (item: AccountReceivable) => {
    if (!item.origins || item.origins.length === 0) return '-';
    return item.origins.map(o => o.origin?.name || '-').join(', ');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contas a Receber</h1>
            <p className="text-muted-foreground">Gerencie suas previsões de recebimento</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            {(role === 'admin' || role === 'editor') && (
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Receber
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
                <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    {origins.map((origin) => (
                      <SelectItem key={origin.id} value={origin.id}>
                        {origin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleFilter}>
                <Search className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batch Actions */}
        {selectedItems.length > 0 && role === 'admin' && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} item(s) selecionado(s)
                </span>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Selecionados
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Previsões de Recebimento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma previsão de recebimento
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {role === 'admin' && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedItems.length === items.length && items.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data Levantamento</TableHead>
                      <TableHead>Origens</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Comprovante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((receivable) => (
                      <TableRow key={receivable.id}>
                        {role === 'admin' && (
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(receivable.id)}
                              onCheckedChange={(checked) => handleSelectItem(receivable.id, checked as boolean)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{receivable.description}</TableCell>
                        <TableCell>{formatDate(receivable.survey_date)}</TableCell>
                        <TableCell>{getOriginsDisplay(receivable)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(receivable.total_value)}</TableCell>
                        <TableCell>
                          {receivable.attachment_url ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadAttachment(receivable)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </Button>
                          ) : (role === 'admin' || role === 'editor') ? (
                            <>
                              <Input
                                id={`upload-${receivable.id}`}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => handleUploadAttachment(receivable, e)}
                              />
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => document.getElementById(`upload-${receivable.id}`)?.click()}
                                disabled={uploadingId === receivable.id}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                {uploadingId === receivable.id ? 'Enviando...' : 'Anexar'}
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewAccountReceivableModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onSave={handleSaveNew}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedItems.length} conta(s) a receber? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AccountsReceivable;
