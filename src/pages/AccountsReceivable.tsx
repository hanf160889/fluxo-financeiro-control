import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, FileSpreadsheet, FileText } from 'lucide-react';
import NewAccountReceivableModal from '@/components/forms/NewAccountReceivableModal';
import { useToast } from '@/hooks/use-toast';

const mockReceivables = [
  {
    id: '1',
    description: 'Vendas Janeiro',
    surveyDate: '2024-01-10',
    totalValue: 25000,
    origin: 'Vendas Loja',
    hasAttachment: true,
  },
  {
    id: '2',
    description: 'Serviços Consultoria',
    surveyDate: '2024-01-08',
    totalValue: 8500,
    origin: 'Consultoria',
    hasAttachment: false,
  },
];

const AccountsReceivable = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExportExcel = () => {
    toast({
      title: "Exportando Excel",
      description: "Download iniciado...",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportando PDF",
      description: "Download iniciado...",
    });
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
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Receber
            </Button>
          </div>
        </div>


        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input type="date" placeholder="Data inicial" />
              </div>
              <div className="flex-1">
                <Input type="date" placeholder="Data final" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Previsões de Recebimento</CardTitle>
          </CardHeader>
          <CardContent>
            {mockReceivables.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma previsão de recebimento
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data Levantamento</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Comprovante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockReceivables.map((receivable) => (
                      <TableRow key={receivable.id}>
                        <TableCell className="font-medium">{receivable.description}</TableCell>
                        <TableCell>{receivable.surveyDate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(receivable.totalValue)}</TableCell>
                        <TableCell>{receivable.origin}</TableCell>
                        <TableCell>
                          {receivable.hasAttachment ? (
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Baixar
                            </Button>
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

      <NewAccountReceivableModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </AppLayout>
  );
};

export default AccountsReceivable;
