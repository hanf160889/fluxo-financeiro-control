import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Upload, Paperclip } from 'lucide-react';

const mockPaidAccounts = [
  {
    id: '1',
    bank: 'Banco do Brasil',
    description: 'Pagamento Fornecedor ABC',
    category: 'Materiais',
    documentNumber: 'DOC-001',
    paymentDate: '2024-01-15',
    value: 3500,
    fineInterest: 0,
    costCenterSplit: [
      { name: 'Empresa 1', percentage: 60 },
      { name: 'Empresa 2', percentage: 40 },
    ],
    hasAttachment: true,
  },
  {
    id: '2',
    bank: 'Itaú',
    description: 'Conta de Luz',
    category: 'Utilidades',
    documentNumber: 'DOC-002',
    paymentDate: '2024-01-14',
    value: 850,
    fineInterest: 12.50,
    costCenterSplit: [
      { name: 'Empresa 1', percentage: 50 },
      { name: 'Empresa 2', percentage: 50 },
    ],
    hasAttachment: false,
  },
];

const BankStatement = () => {
  const [filterPeriod, setFilterPeriod] = useState('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Extratos Bancários</h1>
            <p className="text-muted-foreground">Despesas pagas e importação de extratos</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar OFX/Excel
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Conta Paga
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
              <div className="flex-1">
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas empresas</SelectItem>
                    <SelectItem value="empresa1">Empresa 1</SelectItem>
                    <SelectItem value="empresa2">Empresa 2</SelectItem>
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
            {mockPaidAccounts.length === 0 ? (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPaidAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.bank}</TableCell>
                        <TableCell className="font-medium">{account.description}</TableCell>
                        <TableCell>{account.category}</TableCell>
                        <TableCell>{account.documentNumber}</TableCell>
                        <TableCell>{account.paymentDate}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.value)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.fineInterest)}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {account.costCenterSplit.map((cc, index) => (
                              <div key={index}>{cc.name}: {cc.percentage}%</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {account.hasAttachment ? (
                            <Button variant="ghost" size="icon" title="Ver comprovante">
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Anexar
                            </Button>
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
    </AppLayout>
  );
};

export default BankStatement;
