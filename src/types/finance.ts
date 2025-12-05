export interface CostCenter {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  createdAt: Date;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  createdAt: Date;
}

export interface ReceivableOrigin {
  id: string;
  name: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
}

export interface AccountPayable {
  id: string;
  description: string;
  supplierId: string;
  categoryId: string;
  documentNumber: string;
  dueDate: Date;
  installment: string;
  paymentDate?: Date;
  value: number;
  isPaid: boolean;
  costCenterSplit: { costCenterId: string; percentage: number }[];
  attachmentUrl?: string;
  createdAt: Date;
}

export interface AccountPaid {
  id: string;
  bank: string;
  description: string;
  categoryId: string;
  documentNumber: string;
  paymentDate: Date;
  value: number;
  fineInterest: number;
  costCenterSplit: { costCenterId: string; percentage: number }[];
  attachmentUrl?: string;
  createdAt: Date;
}

export interface AccountReceivable {
  id: string;
  description: string;
  surveyDate: Date;
  totalValue: number;
  origins: { originId: string; value: number }[];
  attachmentUrl?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  fileName: string;
  documentNumber: string;
  uploadDate: Date;
  linkedAccountId?: string;
  linkedAccountType?: 'payable' | 'paid' | 'receivable';
  fileUrl: string;
  thumbnailUrl?: string;
}
