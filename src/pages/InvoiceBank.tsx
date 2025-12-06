import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Download, 
  Eye, 
  Image, 
  Search, 
  Filter, 
  X, 
  LayoutGrid, 
  List, 
  Pencil, 
  Loader2,
  FileArchive 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import JSZip from 'jszip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Invoice {
  id: string;
  fileName: string;
  fileUrl: string;
  documentNumber: string | null;
  paymentDate: string | null;
  linkedAccount: string;
  bank: string | null;
  type: 'pdf' | 'image' | 'other';
}

const InvoiceBank = () => {
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [downloading, setDownloading] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = role === 'admin' || role === 'editor';

  useEffect(() => {
    fetchBanks();
    fetchInvoices();
  }, []);

  const fetchBanks = async () => {
    const { data } = await supabase.from('banks').select('id, name').order('name');
    if (data) setBanks(data);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select('id, description, attachment_url, attachment_name, document_number, payment_date, bank')
        .eq('is_paid', true)
        .not('attachment_url', 'is', null)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const mapped: Invoice[] = (data || []).map(item => {
        const fileName = item.attachment_name || 'Arquivo sem nome';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        let type: 'pdf' | 'image' | 'other' = 'other';
        
        if (ext === 'pdf') {
          type = 'pdf';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
          type = 'image';
        }

        return {
          id: item.id,
          fileName,
          fileUrl: item.attachment_url!,
          documentNumber: item.document_number,
          paymentDate: item.payment_date,
          linkedAccount: item.description,
          bank: item.bank,
          type,
        };
      });

      setInvoices(mapped);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = searchTerm || filterType !== 'all' || startDate || endDate || bankFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
    setBankFilter('all');
  };

  const filteredInvoices = invoices.filter(invoice => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        invoice.fileName.toLowerCase().includes(search) ||
        invoice.linkedAccount.toLowerCase().includes(search) ||
        (invoice.documentNumber?.toLowerCase().includes(search) ?? false);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && invoice.type !== filterType) return false;

    // Date filters
    if (startDate && invoice.paymentDate && invoice.paymentDate < startDate) return false;
    if (endDate && invoice.paymentDate && invoice.paymentDate > endDate) return false;

    // Bank filter
    if (bankFilter !== 'all' && invoice.bank !== bankFilter) return false;

    return true;
  });

  const handleViewAttachment = async (fileUrl: string) => {
    if (!fileUrl) return;
    
    setViewingAttachment(fileUrl);
    toast.info('Gerando link...');
    
    try {
      const urlObj = new URL(fileUrl);
      let fileKey = urlObj.pathname.startsWith('/') 
        ? urlObj.pathname.substring(1) 
        : urlObj.pathname;
      
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
      toast.error('Erro ao abrir arquivo');
    } finally {
      setViewingAttachment(null);
    }
  };

  const handleDownloadAll = async () => {
    if (filteredInvoices.length === 0) {
      toast.error('Não há arquivos para baixar');
      return;
    }

    setDownloading(true);
    toast.info('Preparando arquivos para download...');

    try {
      const zip = new JSZip();
      let successCount = 0;

      for (const invoice of filteredInvoices) {
        try {
          const urlObj = new URL(invoice.fileUrl);
          let fileKey = urlObj.pathname.startsWith('/') 
            ? urlObj.pathname.substring(1) 
            : urlObj.pathname;

          const { data, error } = await supabase.functions.invoke('get-signed-url', {
            body: { fileKey },
          });

          if (error) continue;

          const response = await fetch(data.signedUrl);
          if (!response.ok) continue;

          const blob = await response.blob();
          zip.file(invoice.fileName, blob);
          successCount++;
        } catch (err) {
          console.error('Error downloading file:', invoice.fileName, err);
        }
      }

      if (successCount === 0) {
        throw new Error('Nenhum arquivo baixado');
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notas_fiscais_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${successCount} arquivo(s) baixado(s)!`);
    } catch (error) {
      console.error('Error creating zip:', error);
      toast.error('Erro ao criar arquivo ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditFileName(invoice.fileName);
    setEditDocNumber(invoice.documentNumber || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({
          attachment_name: editFileName,
          document_number: editDocNumber || null,
        })
        .eq('id', editingInvoice.id);

      if (error) throw error;

      toast.success('Nota atualizada!');
      setEditModalOpen(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Erro ao atualizar nota');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Banco de Notas Fiscais</h1>
            <p className="text-muted-foreground">Todos os documentos anexados</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadAll}
              disabled={downloading || filteredInvoices.length === 0}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileArchive className="h-4 w-4 mr-2" />
              )}
              Baixar Notas ({filteredInvoices.length})
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search and view mode */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome, descrição ou documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Other filters */}
              <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Data inicial"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Data final"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Select value={bankFilter} onValueChange={setBankFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos bancos</SelectItem>
                      {banks.map((bank) => (
                        <SelectItem key={bank.id} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos ({filteredInvoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum documento encontrado
              </p>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {invoice.type === 'pdf' ? (
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      ) : invoice.type === 'image' ? (
                        <Image className="h-12 w-12 text-muted-foreground" />
                      ) : (
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate" title={invoice.fileName}>
                        {invoice.fileName}
                      </h3>
                      {invoice.documentNumber && (
                        <p className="text-sm text-muted-foreground">N° {invoice.documentNumber}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{formatDate(invoice.paymentDate)}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate" title={invoice.linkedAccount}>
                        {invoice.linkedAccount}
                      </p>
                      {invoice.bank && (
                        <p className="text-xs text-muted-foreground">Banco: {invoice.bank}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleViewAttachment(invoice.fileUrl)}
                          disabled={viewingAttachment === invoice.fileUrl}
                        >
                          {viewingAttachment === invoice.fileUrl ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Abrir
                            </>
                          )}
                        </Button>
                        {canEdit && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>N° Doc</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {invoice.type === 'pdf' ? (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            ) : invoice.type === 'image' ? (
                              <Image className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="truncate max-w-[200px]" title={invoice.fileName}>
                              {invoice.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{invoice.type}</TableCell>
                        <TableCell>{invoice.documentNumber || '-'}</TableCell>
                        <TableCell>{formatDate(invoice.paymentDate)}</TableCell>
                        <TableCell className="truncate max-w-[200px]" title={invoice.linkedAccount}>
                          {invoice.linkedAccount}
                        </TableCell>
                        <TableCell>{invoice.bank || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewAttachment(invoice.fileUrl)}
                              disabled={viewingAttachment === invoice.fileUrl}
                            >
                              {viewingAttachment === invoice.fileUrl ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Abrir
                                </>
                              )}
                            </Button>
                            {canEdit && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(invoice)}
                              >
                                <Pencil className="h-4 w-4" />
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
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">Nome do Arquivo</Label>
              <Input
                id="fileName"
                value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docNumber">Número do Documento</Label>
              <Input
                id="docNumber"
                value={editDocNumber}
                onChange={(e) => setEditDocNumber(e.target.value)}
                placeholder="Ex: NF-001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default InvoiceBank;
