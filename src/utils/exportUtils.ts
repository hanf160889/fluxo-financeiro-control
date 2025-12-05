import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AccountPayable } from '@/hooks/useAccountsPayable';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getInstallmentText = (item: AccountPayable) => {
  if (item.total_installments && item.total_installments > 1) {
    return `${item.current_installment} de ${item.total_installments}`;
  }
  return '-';
};

export const exportToExcel = (items: AccountPayable[], filename: string = 'contas-a-pagar') => {
  const data = items.map(item => ({
    'Descrição': item.description,
    'Fornecedor': item.supplier?.name || '-',
    'Categoria': item.category?.name || '-',
    'N° Doc': item.document_number || '-',
    'Vencimento': formatDate(item.due_date),
    'Parcela': getInstallmentText(item),
    'Pagamento': item.payment_date ? formatDate(item.payment_date) : '-',
    'Valor': formatCurrency(item.value),
    'Status': item.is_paid ? 'Paga' : 'Pendente',
    'Comprovante': item.attachment_url || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Descrição
    { wch: 15 }, // Fornecedor
    { wch: 15 }, // Categoria
    { wch: 10 }, // N° Doc
    { wch: 12 }, // Vencimento
    { wch: 10 }, // Parcela
    { wch: 12 }, // Pagamento
    { wch: 15 }, // Valor
    { wch: 10 }, // Status
    { wch: 50 }, // Comprovante
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contas a Pagar');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (items: AccountPayable[], filename: string = 'contas-a-pagar') => {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text('Contas a Pagar', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

  const tableData = items.map(item => [
    item.description,
    item.supplier?.name || '-',
    item.category?.name || '-',
    item.document_number || '-',
    formatDate(item.due_date),
    getInstallmentText(item),
    item.payment_date ? formatDate(item.payment_date) : '-',
    formatCurrency(item.value),
    item.is_paid ? 'Paga' : 'Pendente',
    item.attachment_url ? 'Ver anexo' : '-',
  ]);

  autoTable(doc, {
    head: [['Descrição', 'Fornecedor', 'Categoria', 'N° Doc', 'Vencimento', 'Parcela', 'Pagamento', 'Valor', 'Status', 'Comprovante']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 51, 51] },
    didDrawCell: (data) => {
      // Make attachment links clickable
      if (data.column.index === 9 && data.cell.section === 'body') {
        const item = items[data.row.index];
        if (item?.attachment_url) {
          doc.setTextColor(0, 0, 255);
          doc.textWithLink('Ver anexo', data.cell.x + 2, data.cell.y + 5, { url: item.attachment_url });
          doc.setTextColor(0, 0, 0);
        }
      }
    },
  });

  // Add total
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const finalY = (doc as any).lastAutoTable.finalY || 35;
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(total)}`, 14, finalY + 10);

  doc.save(`${filename}.pdf`);
};
