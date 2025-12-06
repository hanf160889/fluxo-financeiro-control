import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import FileAttachmentField from './FileAttachmentField';

interface CostCenter {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Bank {
  id: string;
  name: string;
}

interface PaidAccount {
  id: string;
  description: string;
  supplier_id: string | null;
  category_id: string | null;
  bank: string | null;
  document_number: string | null;
  payment_date: string | null;
  value: number;
  fine_interest: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
}

interface EditPaidAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  account: PaidAccount | null;
}

const EditPaidAccountModal = ({ open, onOpenChange, onSave, account }: EditPaidAccountModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bank, setBank] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [value, setValue] = useState('');
  const [fineInterest, setFineInterest] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [originalAttachmentUrl, setOriginalAttachmentUrl] = useState<string | null>(null);
  const [costCenterPercentages, setCostCenterPercentages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchData();
      if (account) {
        loadAccountData();
      }
    }
  }, [open, account]);

  const fetchData = async () => {
    const [costCentersRes, suppliersRes, categoriesRes, banksRes] = await Promise.all([
      supabase.from('cost_centers').select('id, name').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('banks').select('id, name').order('name'),
    ]);

    if (costCentersRes.data) setCostCenters(costCentersRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (banksRes.data) setBanks(banksRes.data);
  };

  const loadAccountData = async () => {
    if (!account) return;

    setDescription(account.description);
    setSupplierId(account.supplier_id || '');
    setCategoryId(account.category_id || '');
    setBank(account.bank || '');
    setDocumentNumber(account.document_number || '');
    setPaymentDate(account.payment_date || '');
    setValue(account.value.toString());
    setFineInterest((account.fine_interest || 0).toString());
    setAttachmentUrl(account.attachment_url);
    setAttachmentName(account.attachment_name);
    setOriginalAttachmentUrl(account.attachment_url);

    // Load cost center distribution
    const { data: ccData } = await supabase
      .from('accounts_payable_cost_centers')
      .select('cost_center_id, percentage')
      .eq('account_payable_id', account.id);

    if (ccData) {
      const percentages: Record<string, string> = {};
      ccData.forEach(cc => {
        percentages[cc.cost_center_id] = cc.percentage.toString();
      });
      setCostCenterPercentages(percentages);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !user) return;

    // Validate cost center percentages
    const totalPercentage = Object.values(costCenterPercentages).reduce(
      (sum, p) => sum + (parseFloat(p) || 0), 0
    );
    if (totalPercentage > 0 && totalPercentage !== 100) {
      toast.error('O rateio deve totalizar 100%');
      return;
    }

    setLoading(true);
    try {
      // Update account
      const { error: updateError } = await supabase
        .from('accounts_payable')
        .update({
          description,
          supplier_id: supplierId || null,
          category_id: categoryId || null,
          bank: bank || null,
          document_number: documentNumber || null,
          payment_date: paymentDate || null,
          value: parseFloat(value),
          fine_interest: parseFloat(fineInterest) || 0,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        })
        .eq('id', account.id);

      if (updateError) throw updateError;

      // Delete old cost center distributions
      await supabase
        .from('accounts_payable_cost_centers')
        .delete()
        .eq('account_payable_id', account.id);

      // Insert new cost center distributions
      const costCenterEntries = Object.entries(costCenterPercentages)
        .filter(([_, percentage]) => parseFloat(percentage) > 0)
        .map(([costCenterId, percentage]) => ({
          account_payable_id: account.id,
          cost_center_id: costCenterId,
          percentage: parseFloat(percentage),
        }));

      if (costCenterEntries.length > 0) {
        const { error: ccError } = await supabase
          .from('accounts_payable_cost_centers')
          .insert(costCenterEntries);
        if (ccError) throw ccError;
      }

      toast.success('Conta atualizada!');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Erro ao atualizar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta Paga</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bank">Banco</Label>
              <Select value={bank} onValueChange={setBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((b) => (
                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documentNumber">N° Documento</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="paymentDate">Data Pagamento *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="value">Valor *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="fineInterest">Multa/Juros</Label>
              <Input
                id="fineInterest"
                type="number"
                step="0.01"
                value={fineInterest}
                onChange={(e) => setFineInterest(e.target.value)}
              />
            </div>
          </div>

          {/* Cost Center Distribution */}
          <div className="space-y-2">
            <Label>Rateio por Centro de Custo</Label>
            <div className="grid grid-cols-2 gap-2">
              {costCenters.map((cc) => (
                <div key={cc.id} className="flex items-center gap-2">
                  <span className="text-sm flex-1">{cc.name}</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-20"
                    placeholder="%"
                    value={costCenterPercentages[cc.id] || ''}
                    onChange={(e) => setCostCenterPercentages(prev => ({
                      ...prev,
                      [cc.id]: e.target.value,
                    }))}
                  />
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
            previousUrl={originalAttachmentUrl}
            inputId="edit-paid-file"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPaidAccountModal;
