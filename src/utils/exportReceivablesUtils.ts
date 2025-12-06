import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AccountReceivable } from '@/hooks/useAccountsReceivable';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getOriginsText = (item: AccountReceivable) => {
  if (!item.origins || item.origins.length === 0) return '-';
  return item.origins.map(o => o.origin?.name || '-').join(', ');
};

export const exportReceivablesToExcel = (items: AccountReceivable[], filename: string = 'contas-a-receber') => {
  const data = items.map(item => ({
    'Descrição': item.description,
    'Data Levantamento': formatDate(item.survey_date),
    'Origens': getOriginsText(item),
    'Valor Total': formatCurrency(item.total_value),
    'Comprovante': item.attachment_name || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  ws['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 25 },
    { wch: 15 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contas a Receber');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportReceivablesToPDF = (items: AccountReceivable[], filename: string = 'contas-a-receber') => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text('Contas a Receber', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  const tableData = items.map(item => [
    item.description,
    formatDate(item.survey_date),
    getOriginsText(item),
    formatCurrency(item.total_value),
    item.attachment_name ? 'Sim' : 'Não',
  ]);

  autoTable(doc, {
    head: [['Descrição', 'Data Levantamento', 'Origens', 'Valor Total', 'Anexo']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [51, 51, 51] },
  });

  const total = items.reduce((sum, item) => sum + item.total_value, 0);
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(total)}`, 14, finalY + 10);

  doc.save(`${filename}.pdf`);
};
