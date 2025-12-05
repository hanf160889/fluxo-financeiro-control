import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, FileText, Check, Pencil, Paperclip } from 'lucide-react';
import NewAccountPayableModal from '@/components/forms/NewAccountPayableModal';
const mockPayables = [
  {
    id: '1',
    description: 'Aluguel Escritório',
    supplier: 'Imobiliária XYZ',
    category: 'Aluguel',
    documentNumber: 'NF-001',
    dueDate: '2024-01-25',
    installment: '1 de 12',
    paymentDate: null,
    value: 5000,
    isPaid: false,
    hasAttachment: true,
  },
  {
    id: '2',
    description: 'Fornecedor de Materiais',
    supplier: 'Materiais ABC',
    category: 'Materiais',
    documentNumber: 'NF-002',
    dueDate: '2024-01-20',
    installment: '3 de 6',
    paymentDate: '2024-01-18',
    value: 2500,
    isPaid: true,
    hasAttachment: true,
  },
];

const AccountsPayable = () => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
            <h1 className="text-3xl font-bold">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas pendentes</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Pagar
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
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="materiais">Materiais</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            {mockPayables.length === 0 ? (
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
                    {mockPayables.map((payable) => (
                      <TableRow key={payable.id}>
                        <TableCell className="font-medium">{payable.description}</TableCell>
                        <TableCell>{payable.supplier}</TableCell>
                        <TableCell>{payable.category}</TableCell>
                        <TableCell>{payable.documentNumber}</TableCell>
                        <TableCell>{payable.dueDate}</TableCell>
                        <TableCell>{payable.installment}</TableCell>
                        <TableCell>{payable.paymentDate || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payable.value)}</TableCell>
                        <TableCell>
                          <Badge variant={payable.isPaid ? 'default' : 'destructive'}>
                            {payable.isPaid ? 'Paga' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!payable.isPaid && (
                              <Button variant="ghost" size="icon" title="Marcar como paga">
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {payable.hasAttachment && (
                              <Button variant="ghost" size="icon" title="Ver comprovante">
                                <Paperclip className="h-4 w-4" />
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

        <NewAccountPayableModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    </AppLayout>
  );
};

export default AccountsPayable;
