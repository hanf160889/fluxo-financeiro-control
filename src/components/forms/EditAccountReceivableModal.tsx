import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';
import { useOrigins } from '@/hooks/useOrigins';
import { AccountReceivable, AccountReceivableInput } from '@/hooks/useAccountsReceivable';
import FileAttachmentField from './FileAttachmentField';

interface EditAccountReceivableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AccountReceivable | null;
  onSave: (id: string, data: AccountReceivableInput) => Promise<boolean>;
}

interface OriginEntry {
  id: string;
  originId: string;
  value: string;
}

const EditAccountReceivableModal = ({ open, onOpenChange, item, onSave }: EditAccountReceivableModalProps) => {
  const { toast } = useToast();
  const { origins: availableOrigins } = useOrigins();
  const [description, setDescription] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [origins, setOrigins] = useState<OriginEntry[]>([{ id: '1', originId: '', value: '' }]);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [originalAttachmentUrl, setOriginalAttachmentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const totalValue = origins.reduce((sum, o) => sum + (parseFloat(o.value) || 0), 0);

  useEffect(() => {
    if (item && open) {
      setDescription(item.description);
      setSurveyDate(item.survey_date);
      setAttachmentUrl(item.attachment_url);
      setAttachmentName(item.attachment_name);
      setOriginalAttachmentUrl(item.attachment_url);
      
      if (item.origins && item.origins.length > 0) {
        setOrigins(item.origins.map(o => ({
          id: o.id,
          originId: o.origin_id,
          value: o.value.toString(),
        })));
      } else {
        setOrigins([{ id: '1', originId: '', value: '' }]);
      }
    }
  }, [item, open]);

  const handleAddOrigin = () => {
    setOrigins([...origins, { id: Date.now().toString(), originId: '', value: '' }]);
  };

  const handleRemoveOrigin = (id: string) => {
    if (origins.length > 1) {
      setOrigins(origins.filter(o => o.id !== id));
    }
  };

  const handleOriginChange = (id: string, field: 'originId' | 'value', value: string) => {
    setOrigins(origins.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;
    
    if (!description || !surveyDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const validOrigins = origins.filter(o => o.originId && parseFloat(o.value) > 0);
    if (validOrigins.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione ao menos uma origem com valor",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    const success = await onSave(item.id, {
      description,
      survey_date: surveyDate,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      origins: validOrigins.map(o => ({
        origin_id: o.originId,
        value: parseFloat(o.value),
      })),
    });
    
    if (success) {
      onOpenChange(false);
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta a Receber</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição *</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do recebimento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-surveyDate">Data do Levantamento *</Label>
            <Input
              id="edit-surveyDate"
              type="date"
              value={surveyDate}
              onChange={(e) => setSurveyDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Origens *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddOrigin}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Origem
              </Button>
            </div>
            
            {origins.map((origin) => (
              <div key={origin.id} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <Select
                    value={origin.originId}
                    onValueChange={(value) => handleOriginChange(origin.id, 'originId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrigins.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={origin.value}
                    onChange={(e) => handleOriginChange(origin.id, 'value', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                {origins.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOrigin(origin.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Valor Total:</span>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </span>
            </div>
          </div>

          <FileAttachmentField
            attachmentUrl={attachmentUrl}
            attachmentName={attachmentName}
            onAttachmentChange={(url, name) => {
              setAttachmentUrl(url);
              setAttachmentName(name);
            }}
            folder="receivables"
            previousUrl={originalAttachmentUrl}
            inputId="edit-receivable-file"
          />

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountReceivableModal;
