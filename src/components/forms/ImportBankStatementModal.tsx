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
  banco?: string;
  documento?: string;
  multa?: number;
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

  const parseExcelDate = (cell: any): string => {
    if (!cell) return '';
    
    // Excel date serial number
    if (typeof cell === 'number' && cell > 40000 && cell < 60000) {
      const excelDate = XLSX.SSF.parse_date_code(cell);
      return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    }
    
    // String format DD/MM/YY or DD/MM/YYYY
    if (typeof cell === 'string') {
      const match = cell.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        let year = match[3];
        if (year.length === 2) {
          year = parseInt(year) > 50 ? '19' + year : '20' + year;
        }
        return `${year}-${month}-${day}`;
      }
      
      // Already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(cell)) {
        return cell;
      }
    }
    
    return '';
  };

  const parseExcelValue = (cell: any): number => {
    if (!cell) return 0;
    if (typeof cell === 'number') return Math.abs(cell);
    if (typeof cell === 'string') {
      // Remove currency formatting: R$ 1.234,56 -> 1234.56
      const cleaned = cell.replace(/[R$\s.]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.abs(parsed);
    }
    return 0;
  };

  const parseExcel = (data: ArrayBuffer): ImportedTransaction[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    const transactions: ImportedTransaction[] = [];
    
    if (jsonData.length < 2) return transactions;
    
    // Get header row to find column indices
    const headers = jsonData[0].map((h: any) => (h || '').toString().toLowerCase().trim());
    
    // Map column names to indices - support multiple variations
    const colMap: Record<string, number> = {};
    headers.forEach((h: string, i: number) => {
      if (h.includes('banco')) colMap['banco'] = i;
      if (h.includes('descri')) colMap['descricao'] = i;
      if (h.includes('categoria')) colMap['categoria'] = i;
      if (h.includes('doc')) colMap['documento'] = i;
      if (h.includes('data') || h.includes('pgto') || h.includes('pagamento')) colMap['data'] = i;
      if (h === 'valor' || h.includes('valor')) colMap['valor'] = i;
      if (h.includes('multa') || h.includes('juros')) colMap['multa'] = i;
    });
    
    console.log('Column mapping:', colMap, 'Headers:', headers);
    
    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length < 2) continue;
      
      const banco = colMap['banco'] !== undefined ? (row[colMap['banco']] || '').toString() : '';
      const descricao = colMap['descricao'] !== undefined ? (row[colMap['descricao']] || '').toString() : '';
      const documento = colMap['documento'] !== undefined ? (row[colMap['documento']] || '').toString() : '';
      const data = colMap['data'] !== undefined ? parseExcelDate(row[colMap['data']]) : '';
      const valor = colMap['valor'] !== undefined ? parseExcelValue(row[colMap['valor']]) : 0;
      const multa = colMap['multa'] !== undefined ? parseExcelValue(row[colMap['multa']]) : 0;
      
      // Only add if we have at least description and value
      if (descricao && valor > 0) {
        transactions.push({
          id: crypto.randomUUID(),
          date: data || new Date().toISOString().split('T')[0],
          description: descricao,
          value: valor,
          selected: true,
          banco,
          documento,
          multa,
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
                      <TableHead>Banco</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>N° Doc</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Multa/Juros</TableHead>
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
                        <TableCell>{t.banco || '-'}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.documento || '-'}</TableCell>
                        <TableCell>{t.date}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.value)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(t.multa || 0)}</TableCell>
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
