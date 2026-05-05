// Prasan ERP - Unified Type System

export type ID = string;

export interface OrgConfig {
  id: ID;
  name: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  linkInvoicesLedgers: boolean;
  linkInvoicesChanged: boolean;
  inventoryEnabled: boolean;
  strictInventoryInvoicing: boolean;
  currency: string;
  invoiceShowBrandName: boolean;
  invoiceShowSize: boolean;
  invoiceBrandNameLabel: string;
  invoiceSizeLabel: string;
  taxMode: 'manual' | 'percentage';
  taxPercentage: number;
}

export interface LedgerEntry {
  id: ID;
  date: string;
  party?: string;
  station?: string;
  amount: number; // Stored as cents
  discount: number;
  taxOrPaid: number;
  netAmount: number;
  items?: string;
  payment: number;
  type: 'bill' | 'payment';
  paymentMode?: string;
  invoiceId?: string;
  accountId: ID;
}

export interface Account {
  id: ID;
  name: string;
  category: 'Customer' | 'Supplier';
  type: 'Direct' | 'Agency';
  station?: string;
  balance: number; // Stored as cents
  orgId: ID;
  ledger: LedgerEntry[];
}

export interface ItemRow {
  id: ID;
  sno: number;
  style?: string;
  brandName?: string;
  size?: string;
  qty: number;
  rate: number; // Stored as cents
  amount: number; // Stored as cents
  finishedGoodId?: string;
  invoiceId: ID;
}

export interface Invoice {
  id: ID;
  invoiceNo: string;
  date: string;
  customerName: string;
  agencyName?: string;
  city?: string;
  transport?: string;
  transportCharges: number;
  remarks?: string;
  marka?: string;
  itemsDescription?: string;
  subtotal: number;
  discount: number;
  taxes: number;
  grandTotal: number;
  status: 'pending' | 'paid' | 'overdue';
  ledgerEntryId?: string;
  orgId: ID;
  items: ItemRow[];
}

export interface RawMaterial {
  id: ID;
  date: string;
  name: string;
  type?: string;
  qty: number;
  qtyUsed: number;
  remarks?: string;
  price: number;
  total: number;
  location?: string;
  invNo?: string;
  billerName?: string;
  supplierName?: string;
  orgId: ID;
}

export interface WIPGood {
  id: ID;
  date: string;
  name: string;
  status: string;
  totalCost: number;
  orgId: ID;
  rawMaterials: RawMaterialUsage[];
  jobWorks: ManufacturingProcess[];
}

export interface RawMaterialUsage {
  id: ID;
  wipId: ID;
  name: string;
  qty: number;
  cost: number;
}

export interface ManufacturingProcess {
  id: ID;
  wipId: ID;
  name: string;
  supplierName?: string;
  qty: number;
  price: number;
  total: number;
  ledgerEntryId?: string;
}

export interface FinishedGood {
  id: ID;
  date: string;
  name: string;
  qty: number;
  size?: string;
  cost: number;
  remarks?: string;
  location?: string;
  wipBreakdown?: string;
  supplierName?: string;
  ledgerEntryId?: string;
  orgId: ID;
}

// API Payloads
export interface CreateInvoicePayload extends Omit<Invoice, 'id' | 'items' | 'date'> {
  date: string;
  items: Omit<ItemRow, 'id' | 'invoiceId'>[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SystemConfig {
  id: string;
  adminPasswordHash: string;
  dbVersion: number;
}
