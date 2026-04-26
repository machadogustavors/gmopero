// ── Auth ──────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  companyName: string;
  userName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

// ── User ──────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  companyId: string;
}

// ── Company ───────────────────────────────────
export interface Company {
  id: string;
  name: string;
  taxId: string | null;
  legalName: string | null;
  stateRegistration: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cityCode: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  fiscalRegime: number | null;
  defaultIcmsCst: string | null;
  defaultIcmsCsosn: string | null;
  defaultPisCst: string | null;
  defaultCofinsCst: string | null;
  defaultIcmsOrigem: string | null;
  plugnotasRegistered: boolean;
}

// ── Customer ──────────────────────────────────
export interface Customer {
  id: string;
  companyId: string;
  taxId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cityCode: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: string;
  updatedAt: string;
  vehicles?: Vehicle[];
}

// ── Vehicle ───────────────────────────────────
export interface Vehicle {
  id: string;
  companyId: string;
  customerId: string;
  licensePlate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  mileage: number;
  customer?: { id: string; name: string };
}

// ── Service Order ─────────────────────────────
export type ServiceOrderStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'INVOICED' | 'CANCELLED';
export type ItemType = 'PART' | 'SERVICE';

// ── Product / Service Catalog ─────────────
export interface Product {
  id: string;
  companyId: string;
  type: ItemType;
  code: string | null;
  description: string;
  ncm: string | null;
  cfop: string | null;
  unitPrice: number;
  unitCost: number;
  currentStock: number;
  reorderLevel: number;
  lastReceivedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceOrderItem {
  id: string;
  serviceOrderId: string;
  productId: string | null;
  type: ItemType;
  description: string;
  ncm: string | null;
  cfop: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  stockMovedAt: string | null;
}

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SERVICE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'REVERSAL';

export interface StockMovement {
  id: string;
  companyId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  unitCost: number | null;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    code: string | null;
    description: string;
  };
}

export interface ReplenishmentSuggestion {
  productId: string;
  code: string | null;
  description: string;
  currentStock: number;
  reorderLevel: number;
  consumedInPeriod: number;
  avgDailyConsumption: number;
  daysOfCoverage: number | null;
  suggestedQuantity: number;
  estimatedCost: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ReplenishmentSuggestionsResponse {
  data: ReplenishmentSuggestion[];
  meta: {
    daysAnalyzed: number;
    generatedAt: string;
    count: number;
  };
  summary: {
    totalEstimatedCost: number;
    highUrgencyCount: number;
  };
}

export type PurchaseInvoiceStatus =
  | 'DRAFT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cityCode: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  purchaseInvoiceId: string;
  productId: string;
  description: string;
  ncm: string | null;
  cfop: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    code: string | null;
    description: string;
    currentStock?: number;
  };
}

export interface PurchaseInvoice {
  id: string;
  companyId: string;
  supplierId: string;
  invoiceNumber: string | null;
  series: string | null;
  accessKey: string | null;
  issuedAt: string | null;
  status: PurchaseInvoiceStatus;
  notes: string | null;
  totalAmount: number;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier;
  items?: PurchaseInvoiceItem[];
  _count?: { items: number };
}

export interface ServiceOrder {
  id: string;
  companyId: string;
  customerId: string;
  vehicleId: string | null;
  orderNumber: number;
  status: ServiceOrderStatus;
  description: string | null;
  totalParts: number;
  totalServices: number;
  totalAmount: number;
  closedAt: string | null;
  invoicedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  customer?: Customer | { id: string; name: string; taxId?: string };
  vehicle?: Vehicle | { id: string; licensePlate: string; brand?: string; model?: string } | null;
  items?: ServiceOrderItem[];
  invoices?: Invoice[];
  payments?: Payment[];
  _count?: { items: number; payments: number };
}

// ── Invoice ───────────────────────────────────
export type InvoiceStatus = 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DENIED';
export type InvoiceType = 'NFE' | 'NFCE';

export interface Invoice {
  id: string;
  companyId: string;
  serviceOrderId: string;
  plugnotasId: string | null;
  integrationId: string | null;
  type: InvoiceType;
  status: InvoiceStatus;
  accessKey: string | null;
  invoiceNumber: string | null;
  series: string | null;
  pdfUrl: string | null;
  xmlUrl: string | null;
  message: string | null;
  totalAmount: number;
  issuedAt: string | null;
  createdAt: string;
  serviceOrder?: { id: string; orderNumber: number; customer?: { id: string; name: string } };
}

// ── Payment ───────────────────────────────────
export type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP' | 'BANK_TRANSFER';

export interface Payment {
  id: string;
  serviceOrderId: string;
  method: PaymentMethod;
  amount: number;
  paidAt: string;
  notes: string | null;
  serviceOrder?: { id: string; orderNumber: number };
}

// ── Pagination ────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type ReceivableStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface ReceivableItem {
  id: string;
  orderId: string;
  orderNumber: number;
  customer: { id: string; name: string } | null;
  status: ReceivableStatus;
  dueDate: string;
  closedAt: string | null;
  totalAmount: number;
  totalPaid: number;
  pendingAmount: number;
  createdAt: string;
}

export interface ReceivablesResponse {
  data: ReceivableItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    overdueCount: number;
  };
}

export interface CashFlowMovement {
  id: string;
  type: 'INFLOW' | 'OUTFLOW';
  date: string;
  amount: number;
  description: string;
  reference: string;
}

export interface CashFlowResponse {
  period: {
    from: string;
    to: string;
  };
  summary: {
    inflows: number;
    outflows: number;
    balance: number;
  };
  movements: CashFlowMovement[];
}
