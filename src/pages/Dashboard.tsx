import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Receipt, TrendingUp, ArrowRight, FileText } from 'lucide-react';

const mockCostCenters = [
  { id: '1', name: 'Empresa 1', total: 45000 },
  { id: '2', name: 'Empresa 2', total: 32000 },
];

const mockRecentTransactions = [
  { id: '1', description: 'Aluguel escritório', value: 5000, date: '2024-01-15', type: 'expense' },
  { id: '2', description: 'Fornecedor XYZ', value: 2500, date: '2024-01-14', type: 'expense' },
  { id: '3', description: 'Receita Vendas', value: 15000, date: '2024-01-13', type: 'income' },
  { id: '4', description: 'Energia elétrica', value: 800, date: '2024-01-12', type: 'expense' },
];

const months = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('01');
  
  const totalExpenses = mockCostCenters.reduce((acc, cc) => acc + cc.total, 0);

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
            <h1 className="text-3xl font-bold">Visão Geral do Mês</h1>
            <p className="text-muted-foreground">Acompanhe suas despesas e receitas</p>
          </div>
          
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesa Total do Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">Todas as empresas</p>
            </CardContent>
          </Card>
          
          {mockCostCenters.map((cc) => (
            <Card key={cc.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{cc.name}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(cc.total)}</div>
                <p className="text-xs text-muted-foreground">
                  {((cc.total / totalExpenses) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => navigate('/contas-pagar')}>
            <CreditCard className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Contas a Pagar</div>
              <div className="text-xs text-muted-foreground">Gerenciar pendências</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => navigate('/extrato-bancario')}>
            <Receipt className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Contas Pagas</div>
              <div className="text-xs text-muted-foreground">Extrato bancário</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button variant="outline" className="h-auto py-4 justify-start" onClick={() => navigate('/contas-receber')}>
            <TrendingUp className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Contas a Receber</div>
              <div className="text-xs text-muted-foreground">Previsão de receitas</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Lançamentos</CardTitle>
            <CardDescription>Movimentações mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {mockRecentTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Ainda não há despesas registradas neste mês
              </p>
            ) : (
              <div className="space-y-4">
                {mockRecentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.date}</p>
                    </div>
                    <span className={transaction.type === 'income' ? 'text-green-500' : 'text-destructive'}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
