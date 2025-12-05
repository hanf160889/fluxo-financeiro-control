import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye, Image } from 'lucide-react';

const mockInvoices = [
  {
    id: '1',
    fileName: 'nota_fiscal_001.pdf',
    documentNumber: 'NF-001',
    uploadDate: '2024-01-15',
    linkedAccount: 'Aluguel Escritório',
    type: 'pdf',
  },
  {
    id: '2',
    fileName: 'cupom_compra.jpg',
    documentNumber: 'CUP-002',
    uploadDate: '2024-01-14',
    linkedAccount: 'Material de escritório',
    type: 'image',
  },
  {
    id: '3',
    fileName: 'recibo_servico.pdf',
    documentNumber: 'REC-003',
    uploadDate: '2024-01-12',
    linkedAccount: 'Serviço de limpeza',
    type: 'pdf',
  },
];

const InvoiceBank = () => {
  const [filterType, setFilterType] = useState('all');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Banco de Notas Fiscais</h1>
            <p className="text-muted-foreground">Todos os documentos anexados</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="image">Imagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input type="date" placeholder="Data inicial" />
              </div>
              <div className="flex-1">
                <Input type="date" placeholder="Data final" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            {mockInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum documento enviado
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockInvoices.map((invoice) => (
                  <Card key={invoice.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {invoice.type === 'pdf' ? (
                        <FileText className="h-12 w-12 text-muted-foreground" />
                      ) : (
                        <Image className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate">{invoice.fileName}</h3>
                      <p className="text-sm text-muted-foreground">N° {invoice.documentNumber}</p>
                      <p className="text-sm text-muted-foreground">{invoice.uploadDate}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vinculado: {invoice.linkedAccount}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" />
                          Abrir
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default InvoiceBank;
