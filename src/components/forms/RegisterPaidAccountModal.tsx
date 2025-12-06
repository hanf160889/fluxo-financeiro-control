import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import FileAttachmentField from './FileAttachmentField';

interface CostCenterPercentage {
  id: string;
  name: string;
  percentage: number;
}

interface RegisterPaidAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const RegisterPaidAccountModal = ({ open, onOpenChange, onSave }: RegisterPaidAccountModalProps) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bankId, setBankId] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [value, setValue] = useState('');
  const [fineInterest, setFineInterest] = useState('');
  const [costCenters, setCostCenters] = useState<CostCenterPercentage[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setDescription('');
    setSupplierId('');
    setCategoryId('');
    setBankId('');
    setDocumentNumber('');
    setPaymentDate('');
    setValue('');
    setFineInterest('');
    setAttachmentUrl(null);
    setAttachmentName(null);
  };

  const fetchData = async () => {
    const [suppliersRes, categoriesRes, costCentersRes, banksRes] = await Promise.all([
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('cost_centers').select('id, name').order('name'),
      supabase.from('banks').select('id, name').order('name'),
    ]);

    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (banksRes.data) setBanks(banksRes.data);
    if (costCentersRes.data) {
      setCostCenters(costCentersRes.data.map(cc => ({ ...cc, percentage: 0 })));
    }
  };

  const handleCostCenterChange = (id: string, percentage: number) => {
    setCostCenters(prev => prev.map(cc => 
      cc.id === id ? { ...cc, percentage } : cc
    ));
  };

  const validatePercentages = () => {
    const total = costCenters.reduce((sum, cc) => sum + cc.percentage, 0);
    return total === 100 || total === 0;
  };

  const handleSubmit = async () => {
    if (!description || !paymentDate || !value || !bankId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (!validatePercentages()) {
      toast.error('A soma dos percentuais deve ser 100% ou 0%');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBank = banks.find(b => b.id === bankId);
      
      const { data: inserted, error } = await supabase
        .from('accounts_payable')
        .insert({
          description,
          supplier_id: supplierId || null,
          category_id: categoryId || null,
          bank: selectedBank?.name || null,
          document_number: documentNumber || null,
          due_date: paymentDate,
          payment_date: paymentDate,
          value: parseFloat(value),
          fine_interest: fineInterest ? parseFloat(fineInterest) : 0,
          is_paid: true,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert cost center distributions
      const distributions = costCenters
        .filter(cc => cc.percentage > 0)
        .map(cc => ({
          account_payable_id: inserted.id,
          cost_center_id: cc.id,
          percentage: cc.percentage,
        }));

      if (distributions.length > 0) {
        const { error: ccError } = await supabase
          .from('accounts_payable_cost_centers')
          .insert(distributions);
        if (ccError) throw ccError;
      }

      toast.success('Conta paga registrada com sucesso!');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao registrar conta paga');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Conta Paga</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição da despesa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Banco *</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentNumber">Nº Documento</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="DOC-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data Pagamento *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fineInterest">Multa/Juros</Label>
            <Input
              id="fineInterest"
              type="number"
              step="0.01"
              value={fineInterest}
              onChange={(e) => setFineInterest(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Rateio por Centro de Custo (%)</Label>
            <div className="grid grid-cols-2 gap-2">
              {costCenters.map((cc) => (
                <div key={cc.id} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{cc.name}</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={cc.percentage}
                    onChange={(e) => handleCostCenterChange(cc.id, Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm">%</span>
                </div>
              ))}
            </div>
          </div>

          <FileAttachmentField
            attachmentUrl={attachmentUrl}
            attachmentName={attachmentName}
            onAttachmentChange={(url, name) => {
              setAttachmentUrl(url);
              setAttachmentName(name);
            }}
            folder="extratos-bancarios"
            inputId="register-paid-file"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPaidAccountModal;
