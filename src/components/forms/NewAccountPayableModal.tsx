import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSuppliers, useCategories, useCostCenters } from '@/hooks/useSettings';
import { AccountPayableInput } from '@/hooks/useAccountsPayable';
import { supabase } from '@/integrations/supabase/client';

interface NewAccountPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountPayableInput) => Promise<boolean>;
}

const NewAccountPayableModal = ({ open, onOpenChange, onSubmit }: NewAccountPayableModalProps) => {
  const { items: suppliers } = useSuppliers();
  const { items: categories } = useCategories();
  const { items: costCenters } = useCostCenters();

  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [category, setCategory] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [value, setValue] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('');
  const [costCenterPercentages, setCostCenterPercentages] = useState<Record<string, string>>({});
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize cost center percentages when costCenters load
  useEffect(() => {
    if (costCenters.length > 0 && Object.keys(costCenterPercentages).length === 0) {
      setCostCenterPercentages(
        Object.fromEntries(costCenters.map((cc) => [cc.id, '']))
      );
    }
  }, [costCenters]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachment(file);
      
      // Upload to Wasabi
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'contas-a-pagar');

        const { data, error } = await supabase.functions.invoke('upload-to-wasabi', {
          body: formData,
        });

        if (error) throw error;
        
        if (data.success) {
          setAttachmentUrl(data.url);
          toast.success('Arquivo enviado com sucesso!');
        } else {
          throw new Error(data.error || 'Erro ao enviar arquivo');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar arquivo';
        toast.error(errorMessage);
        setAttachment(null);
        setAttachmentUrl(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachment(null);
    setAttachmentUrl(null);
  };

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
    if (!description || !supplier || !category || !dueDate || !value) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!validatePercentages()) {
      toast.error('A soma dos percentuais deve ser 100%');
      return;
    }

    if (isUploading) {
      toast.error('Aguarde o upload do arquivo terminar');
      return;
    }

    setIsSubmitting(true);

    const costCentersData = Object.entries(costCenterPercentages)
      .filter(([_, percentage]) => parseFloat(percentage) > 0)
      .map(([cost_center_id, percentage]) => ({
        cost_center_id,
        percentage: parseFloat(percentage),
      }));

    const data: AccountPayableInput = {
      description,
      supplier_id: supplier,
      category_id: category,
      document_number: documentNumber || null,
      due_date: dueDate,
      value: parseFloat(value),
      is_recurring: isRecurring,
      total_installments: isRecurring ? parseInt(installments) || null : null,
      current_installment: null,
      attachment_url: attachmentUrl,
      attachment_name: attachment?.name || null,
      cost_centers: costCentersData,
    };

    const success = await onSubmit(data);
    
    setIsSubmitting(false);
    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setSupplier('');
    setCategory('');
    setDocumentNumber('');
    setDueDate('');
    setValue('');
    setIsRecurring(false);
    setInstallments('');
    setCostCenterPercentages(
      Object.fromEntries(costCenters.map((cc) => [cc.id, '']))
    );
    setAttachment(null);
    setAttachmentUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da conta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier">Fornecedor *</Label>
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
              <Label htmlFor="category">Categoria *</Label>
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
              <Label htmlFor="documentNumber">N° do Documento</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="NF-001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="value">Valor *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring">Pagamento recorrente</Label>
            </div>
            
            {isRecurring && (
              <div className="flex items-center gap-2">
                <Label htmlFor="installments">Parcelas:</Label>
                <Input
                  id="installments"
                  type="number"
                  min="2"
                  className="w-20"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="12"
                />
              </div>
            )}
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

          <div className="grid gap-2">
            <Label>Comprovante</Label>
            {attachment ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-sm flex-1 truncate">{attachment.name}</span>
                )}
                {attachmentUrl && (
                  <span className="text-xs text-green-600">✓ Enviado</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="h-8 w-8"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Clique para anexar arquivo
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewAccountPayableModal;
