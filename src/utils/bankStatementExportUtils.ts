import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PaidAccount {
  id: string;
  bank: string | null;
  description: string;
  category_name: string | null;
  document_number: string | null;
  payment_date: string | null;
  value: number;
  fine_interest: number | null;
  attachment_url: string | null;
  attachment_name: string | null;
  cost_centers: { name: string; percentage: number }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getCostCenterText = (costCenters: { name: string; percentage: number }[]) => {
  if (costCenters.length === 0) return '-';
  return costCenters.map(cc => `${cc.name}: ${cc.percentage}%`).join(', ');
};

export const exportBankStatementToExcel = (items: PaidAccount[], filename: string = 'extrato-bancario') => {
  const data = items.map(item => ({
    'Banco': item.bank || '-',
    'Descrição': item.description,
    'Categoria': item.category_name || '-',
    'N° Doc': item.document_number || '-',
    'Data Pagamento': formatDate(item.payment_date),
    'Valor': formatCurrency(item.value),
    'Multa/Juros': formatCurrency(item.fine_interest || 0),
    'Total': formatCurrency(item.value + (item.fine_interest || 0)),
    'Rateio': getCostCenterText(item.cost_centers),
    'Comprovante': item.attachment_name || (item.attachment_url ? 'Sim' : 'Não'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  ws['!cols'] = [
    { wch: 15 }, // Banco
    { wch: 30 }, // Descrição
    { wch: 15 }, // Categoria
    { wch: 12 }, // N° Doc
    { wch: 15 }, // Data Pagamento
    { wch: 15 }, // Valor
    { wch: 12 }, // Multa/Juros
    { wch: 15 }, // Total
    { wch: 25 }, // Rateio
    { wch: 20 }, // Comprovante
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extrato Bancário');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportBankStatementToPDF = (items: PaidAccount[], filename: string = 'extrato-bancario') => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text('Extrato Bancário - Contas Pagas', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  const tableData = items.map(item => [
    item.bank || '-',
    item.description,
    item.category_name || '-',
    item.document_number || '-',
    formatDate(item.payment_date),
    formatCurrency(item.value),
    formatCurrency(item.fine_interest || 0),
    getCostCenterText(item.cost_centers),
    item.attachment_url ? 'Sim' : 'Não',
  ]);

  autoTable(doc, {
    head: [['Banco', 'Descrição', 'Categoria', 'N° Doc', 'Data Pgto', 'Valor', 'Multa/Juros', 'Rateio', 'Anexo']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 51, 51] },
    columnStyles: {
      1: { cellWidth: 50 }, // Descrição
      7: { cellWidth: 40 }, // Rateio
    },
  });

  // Add totals
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const totalFineInterest = items.reduce((sum, item) => sum + (item.fine_interest || 0), 0);
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  
  doc.setFontSize(10);
  doc.text(`Total Valor: ${formatCurrency(totalValue)}`, 14, finalY + 10);
  doc.text(`Total Multa/Juros: ${formatCurrency(totalFineInterest)}`, 14, finalY + 16);
  doc.setFontSize(12);
  doc.text(`Total Geral: ${formatCurrency(totalValue + totalFineInterest)}`, 14, finalY + 24);

  doc.save(`${filename}.pdf`);
};
