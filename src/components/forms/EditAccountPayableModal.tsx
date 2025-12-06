import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSuppliers, useCategories, useCostCenters } from '@/hooks/useSettings';
import { AccountPayable } from '@/hooks/useAccountsPayable';
import { supabase } from '@/integrations/supabase/client';
import FileAttachmentField from './FileAttachmentField';

interface EditAccountPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AccountPayable | null;
  onSave: () => void;
}

const EditAccountPayableModal = ({ open, onOpenChange, item, onSave }: EditAccountPayableModalProps) => {
  const { items: suppliers } = useSuppliers();
  const { items: categories } = useCategories();
  const { items: costCenters } = useCostCenters();

  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [value, setValue] = useState('');
  const [costCenterPercentages, setCostCenterPercentages] = useState<Record<string, string>>({});
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [originalAttachmentUrl, setOriginalAttachmentUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item && open) {
      setDescription(item.description);
      setSupplier(item.supplier_id || '');
      setCategory(item.category_id || '');
      setDocumentNumber(item.document_number || '');
      setDueDate(item.due_date);
      setValue(item.value.toString());
      setAttachmentUrl(item.attachment_url);
      setAttachmentName(item.attachment_name);
      setOriginalAttachmentUrl(item.attachment_url);
      
      // Set cost center percentages
      const percentages: Record<string, string> = {};
      costCenters.forEach(cc => {
        const found = item.cost_centers?.find(icc => icc.cost_center_id === cc.id);
        percentages[cc.id] = found ? found.percentage.toString() : '';
      });
      setCostCenterPercentages(percentages);
    }
  }, [item, open, costCenters]);

  const handleCostCenterChange = (costCenterId: string, percentage: string) => {
    setCostCenterPercentages((prev) => ({
      ...prev,
      [costCenterId]: percentage,
    }));
  };

  const validatePercentages = () => {
    const total = Object.values(costCenterPercentages).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
    return total === 100;
  };

  const handleSubmit = async () => {
    if (!item) return;
    
    if (!description || !supplier || !category || !dueDate || !value) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!validatePercentages()) {
      toast.error('A soma dos percentuais deve ser 100%');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the account
      const { error: updateError } = await supabase
        .from('accounts_payable')
        .update({
          description,
          supplier_id: supplier,
          category_id: category,
          document_number: documentNumber || null,
          due_date: dueDate,
          value: parseFloat(value),
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Delete existing cost center distributions
      const { error: deleteError } = await supabase
        .from('accounts_payable_cost_centers')
        .delete()
        .eq('account_payable_id', item.id);

      if (deleteError) throw deleteError;

      // Insert new cost center distributions
      const costCentersData = Object.entries(costCenterPercentages)
        .filter(([_, percentage]) => parseFloat(percentage) > 0)
        .map(([cost_center_id, percentage]) => ({
          account_payable_id: item.id,
          cost_center_id,
          percentage: parseFloat(percentage),
        }));

      if (costCentersData.length > 0) {
        const { error: insertError } = await supabase
          .from('accounts_payable_cost_centers')
          .insert(costCentersData);

        if (insertError) throw insertError;
      }

      toast.success('Conta atualizada com sucesso!');
      onSave();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar conta';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta a Pagar</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Descrição *</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da conta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-supplier">Fornecedor *</Label>
              <Select value={supplier} onValueChange={setSupplier}>
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

            <div className="grid gap-2">
              <Label htmlFor="edit-category">Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-documentNumber">N° do Documento</Label>
              <Input
                id="edit-documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="NF-001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-dueDate">Data de Vencimento *</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-value">Valor *</Label>
            <Input
              id="edit-value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="grid gap-2">
            <Label>Divisão por Centro de Custo (%)</Label>
            <div className="grid grid-cols-2 gap-4">
              {costCenters.map((cc) => (
                <div key={cc.id} className="flex items-center gap-2">
                  <Label className="min-w-[80px] text-sm">{cc.name}:</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={costCenterPercentages[cc.id] || ''}
                    onChange={(e) => handleCostCenterChange(cc.id, e.target.value)}
                    placeholder="0"
                    className="w-20"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              A soma dos percentuais deve ser 100%
            </p>
          </div>

          <FileAttachmentField
            attachmentUrl={attachmentUrl}
            attachmentName={attachmentName}
            onAttachmentChange={(url, name) => {
              setAttachmentUrl(url);
              setAttachmentName(name);
            }}
            folder="contas-a-pagar"
            previousUrl={originalAttachmentUrl}
            inputId="edit-payable-file"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountPayableModal;
