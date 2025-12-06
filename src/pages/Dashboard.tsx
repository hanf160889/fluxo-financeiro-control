import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Receipt, TrendingUp, ArrowRight, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface CostCenter {
  id: string;
  name: string;
}

interface PaidAccount {
  id: string;
  value: number;
  payment_date: string;
  fine_interest: number | null;
}

interface CostCenterDistribution {
  account_payable_id: string;
  cost_center_id: string;
  percentage: number;
}

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

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const Dashboard = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear] = useState(currentDate.getFullYear());
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [paidAccounts, setPaidAccounts] = useState<PaidAccount[]>([]);
  const [costCenterDistributions, setCostCenterDistributions] = useState<CostCenterDistribution[]>([]);
  const [chartView, setChartView] = useState<'total' | string>('total');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [costCentersRes, paidAccountsRes, distributionsRes] = await Promise.all([
        supabase.from('cost_centers').select('id, name').order('name'),
        supabase.from('accounts_payable').select('id, value, payment_date, fine_interest').eq('is_paid', true),
        supabase.from('accounts_payable_cost_centers').select('account_payable_id, cost_center_id, percentage'),
      ]);

      if (costCentersRes.data) setCostCenters(costCentersRes.data);
      if (paidAccountsRes.data) setPaidAccounts(paidAccountsRes.data);
      if (distributionsRes.data) setCostCenterDistributions(distributionsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter paid accounts by selected month/year
  const filteredPaidAccounts = useMemo(() => {
    return paidAccounts.filter(account => {
      if (!account.payment_date) return false;
      const paymentDate = new Date(account.payment_date);
      return paymentDate.getMonth() + 1 === parseInt(selectedMonth) && 
             paymentDate.getFullYear() === selectedYear;
    });
  }, [paidAccounts, selectedMonth, selectedYear]);

  // Calculate total expenses for the selected month
  const totalExpenses = useMemo(() => {
    return filteredPaidAccounts.reduce((sum, account) => {
      const total = account.value + (account.fine_interest || 0);
      return sum + total;
    }, 0);
  }, [filteredPaidAccounts]);

  // Calculate expenses by cost center for the selected month
  const expensesByCostCenter = useMemo(() => {
    const result: { [key: string]: number } = {};
    
    costCenters.forEach(cc => {
      result[cc.id] = 0;
    });

    filteredPaidAccounts.forEach(account => {
      const totalValue = account.value + (account.fine_interest || 0);
      const distributions = costCenterDistributions.filter(d => d.account_payable_id === account.id);
      
      if (distributions.length > 0) {
        distributions.forEach(dist => {
          result[dist.cost_center_id] = (result[dist.cost_center_id] || 0) + (totalValue * dist.percentage / 100);
        });
      }
    });

    return result;
  }, [filteredPaidAccounts, costCenterDistributions, costCenters]);

  // Generate chart data for last 12 months
  const chartData = useMemo(() => {
    const data: { month: string; total: number; [key: string]: number | string }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(selectedYear, parseInt(selectedMonth) - 1 - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthAccounts = paidAccounts.filter(account => {
        if (!account.payment_date) return false;
        const paymentDate = new Date(account.payment_date);
        return paymentDate.getMonth() === month && paymentDate.getFullYear() === year;
      });

      const monthData: { month: string; total: number; [key: string]: number | string } = {
        month: `${monthNames[month]}/${String(year).slice(2)}`,
        total: 0,
      };

      // Initialize cost center values
      costCenters.forEach(cc => {
        monthData[cc.id] = 0;
      });

      monthAccounts.forEach(account => {
        const totalValue = account.value + (account.fine_interest || 0);
        monthData.total += totalValue;

        const distributions = costCenterDistributions.filter(d => d.account_payable_id === account.id);
        if (distributions.length > 0) {
          distributions.forEach(dist => {
            monthData[dist.cost_center_id] = (monthData[dist.cost_center_id] as number || 0) + (totalValue * dist.percentage / 100);
          });
        }
      });

      data.push(monthData);
    }

    return data;
  }, [paidAccounts, costCenterDistributions, costCenters, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const chartConfig = useMemo(() => {
    const config: { [key: string]: { label: string; color: string } } = {
      total: { label: 'Total', color: 'hsl(var(--primary))' },
    };
    
    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    costCenters.forEach((cc, index) => {
      config[cc.id] = { label: cc.name, color: colors[index % colors.length] };
    });
    
    return config;
  }, [costCenters]);

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
          
          {costCenters.map((cc) => {
            const ccTotal = expensesByCostCenter[cc.id] || 0;
            const percentage = totalExpenses > 0 ? ((ccTotal / totalExpenses) * 100).toFixed(1) : '0.0';
            return (
              <Card key={cc.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{cc.name}</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(ccTotal)}</div>
                  <p className="text-xs text-muted-foreground">
                    {percentage}% do total
                  </p>
                </CardContent>
              </Card>
            );
          })}
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

        {/* Expenses Chart */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Despesas Últimos 12 Meses</CardTitle>
              <CardDescription>Visualização de despesas por período</CardDescription>
            </div>
            <Select value={chartView} onValueChange={setChartView}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione a visão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Nenhum dado disponível</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    {chartView === 'total' ? (
                      <Bar 
                        dataKey="total" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        name="Total"
                      />
                    ) : (
                      <Bar 
                        dataKey={chartView} 
                        fill={chartConfig[chartView]?.color || 'hsl(var(--primary))'} 
                        radius={[4, 4, 0, 0]}
                        name={chartConfig[chartView]?.label || 'Valor'}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
