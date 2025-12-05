import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportedTransaction {
  id: string;
  date: string;
  description: string;
  value: number;
  selected: boolean;
}

interface ImportBankStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (transactions: ImportedTransaction[]) => void;
}

const ImportBankStatementModal = ({ open, onOpenChange, onImport }: ImportBankStatementModalProps) => {
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseOFX = (content: string): ImportedTransaction[] => {
    const transactions: ImportedTransaction[] = [];
    
    // Simple OFX parser - looks for STMTTRN blocks
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const matches = content.matchAll(transactionRegex);
    
    for (const match of matches) {
      const block = match[1];
      
      const dtposted = block.match(/<DTPOSTED>(\d{8})/)?.[1];
      const trnamt = block.match(/<TRNAMT>([+-]?\d+\.?\d*)/)?.[1];
      const memo = block.match(/<MEMO>([^<\n]+)/)?.[1] || block.match(/<NAME>([^<\n]+)/)?.[1] || '';
      
      if (dtposted && trnamt) {
        const year = dtposted.substring(0, 4);
        const month = dtposted.substring(4, 6);
        const day = dtposted.substring(6, 8);
        const date = `${year}-${month}-${day}`;
        const value = Math.abs(parseFloat(trnamt));
        
        // Only include debits (negative values in OFX)
        if (parseFloat(trnamt) < 0) {
          transactions.push({
            id: crypto.randomUUID(),
            date,
            description: memo.trim(),
            value,
            selected: true,
          });
        }
      }
    }
    
    return transactions;
  };

  const parseExcel = (data: ArrayBuffer): ImportedTransaction[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    const transactions: ImportedTransaction[] = [];
    
    // Skip header row, look for rows with date, description, value
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 2) continue;
      
      // Try to find date, description, and value columns
      let date = '';
      let description = '';
      let value = 0;
      
      for (const cell of row) {
        if (cell === null || cell === undefined) continue;
        
        // Check if it's a date
        if (typeof cell === 'number' && cell > 40000 && cell < 50000) {
          // Excel date serial number
          const excelDate = XLSX.SSF.parse_date_code(cell);
          date = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
        } else if (typeof cell === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(cell)) {
          const [day, month, year] = cell.split('/');
          date = `${year}-${month}-${day}`;
        } else if (typeof cell === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cell)) {
          date = cell;
        } else if (typeof cell === 'number' && !date) {
          value = Math.abs(cell);
        } else if (typeof cell === 'string' && cell.length > 3 && !description) {
          description = cell;
        }
      }
      
      if (date && description && value > 0) {
        transactions.push({
          id: crypto.randomUUID(),
          date,
          description,
          value,
          selected: true,
        });
      }
    }
    
    return transactions;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    
    try {
      const extension = file.name.toLowerCase().split('.').pop();
      
      if (extension === 'ofx') {
        const content = await file.text();
        const parsed = parseOFX(content);
        if (parsed.length === 0) {
          toast.error('Nenhuma transação encontrada no arquivo OFX');
        } else {
          setTransactions(parsed);
          toast.success(`${parsed.length} transações encontradas`);
        }
      } else if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await file.arrayBuffer();
        const parsed = parseExcel(buffer);
        if (parsed.length === 0) {
          toast.error('Nenhuma transação encontrada no arquivo Excel');
        } else {
          setTransactions(parsed);
          toast.success(`${parsed.length} transações encontradas`);
        }
      } else {
        toast.error('Formato de arquivo não suportado. Use OFX ou Excel.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTransaction = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ));
  };

  const toggleAll = (checked: boolean) => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: checked })));
  };

  const handleImport = () => {
    const selectedTransactions = transactions.filter(t => t.selected);
    if (selectedTransactions.length === 0) {
      toast.error('Selecione ao menos uma transação');
      return;
    }
    onImport(selectedTransactions);
    onOpenChange(false);
    setTransactions([]);
    setFileName('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setTransactions([]);
    setFileName('');
  };

  const selectedCount = transactions.filter(t => t.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {transactions.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Selecione um arquivo OFX ou Excel para importar
              </p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Selecionar Arquivo
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Arquivo: {fileName} | {selectedCount} de {transactions.length} selecionadas
                </p>
                <Button variant="outline" size="sm" onClick={() => {
                  setTransactions([]);
                  setFileName('');
                }}>
                  Trocar Arquivo
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCount === transactions.length}
                          onCheckedChange={(checked) => toggleAll(!!checked)}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={t.selected}
                            onCheckedChange={() => toggleTransaction(t.id)}
                          />
                        </TableCell>
                        <TableCell>{t.date}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {transactions.length > 0 && (
            <Button onClick={handleImport}>
              Importar {selectedCount} Transações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportBankStatementModal;
