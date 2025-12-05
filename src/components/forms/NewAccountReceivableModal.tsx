import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus, X } from 'lucide-react';

interface NewAccountReceivableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mock data - will come from settings
const mockOrigins = [
  { id: '1', name: 'Vendas Loja' },
  { id: '2', name: 'Consultoria' },
  { id: '3', name: 'Serviços Online' },
];

interface OriginEntry {
  id: string;
  originId: string;
  value: string;
}

const NewAccountReceivableModal = ({ open, onOpenChange }: NewAccountReceivableModalProps) => {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [origins, setOrigins] = useState<OriginEntry[]>([{ id: '1', originId: '', value: '' }]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const totalValue = origins.reduce((sum, o) => sum + (parseFloat(o.value) || 0), 0);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !surveyDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const hasValidOrigin = origins.some(o => o.originId && o.value);
    if (!hasValidOrigin) {
      toast({
        title: "Erro",
        description: "Adicione ao menos uma origem com valor",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Sucesso",
      description: "Recebimento registrado com sucesso",
    });
    
    // Reset form
    setDescription('');
    setSurveyDate('');
    setOrigins([{ id: '1', originId: '', value: '' }]);
    setAttachment(null);
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Receber</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do recebimento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="surveyDate">Data do Levantamento *</Label>
            <Input
              id="surveyDate"
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
            
            {origins.map((origin, index) => (
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
                      {mockOrigins.map((o) => (
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

          <div className="space-y-2">
            <Label htmlFor="attachment">Comprovante</Label>
            <div className="flex items-center gap-2">
              <Input
                id="attachment"
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('attachment')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {attachment ? attachment.name : 'Selecionar arquivo'}
              </Button>
            </div>
          </div>

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

export default NewAccountReceivableModal;
