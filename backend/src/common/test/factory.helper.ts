import {
  Prisma,
  UserRole,
  ServiceOrderStatus,
  ItemType,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
} from '@prisma/client';
const Decimal = Prisma.Decimal;

let counter = 0;
const nextId = () => `test-id-${++counter}`;
const now = new Date('2026-01-15T10:00:00.000Z');

export const resetFactoryCounter = () => {
  counter = 0;
};

export const createMockCompany = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  name: 'Test Auto Shop',
  taxId: '08187168000160',
  legalName: 'Test Auto Shop LTDA',
  stateRegistration: '123456789',
  street: 'Rua das Oficinas',
  number: '100',
  complement: null,
  neighborhood: 'Centro',
  cityCode: '4115200',
  city: 'Maringa',
  state: 'PR',
  zipCode: '87020025',
  phone: '44999990000',
  email: 'contato@test.com',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockUser = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  companyId: 'test-company-id',
  name: 'Test User',
  email: `user-${counter}@test.com`,
  passwordHash: '$2b$12$hashedpassword',
  role: UserRole.OWNER,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockCustomer = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  companyId: 'test-company-id',
  taxId: '12345678901',
  name: 'Test Customer',
  email: 'customer@test.com',
  phone: '44999001122',
  street: 'Av. Brasil',
  number: '500',
  complement: null,
  neighborhood: 'Centro',
  cityCode: '4115200',
  city: 'Maringa',
  state: 'PR',
  zipCode: '87010000',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockVehicle = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  companyId: 'test-company-id',
  customerId: 'test-customer-id',
  licensePlate: `ABC${counter}D23`,
  brand: 'Fiat',
  model: 'Argo',
  year: 2022,
  color: 'White',
  mileage: 45000,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockServiceOrder = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  companyId: 'test-company-id',
  customerId: 'test-customer-id',
  vehicleId: 'test-vehicle-id',
  orderNumber: counter,
  status: ServiceOrderStatus.DRAFT,
  description: 'Test service order',
  totalParts: new Decimal(0),
  totalServices: new Decimal(0),
  totalAmount: new Decimal(0),
  closedAt: null,
  invoicedAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockServiceOrderItem = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  serviceOrderId: 'test-service-order-id',
  type: ItemType.PART,
  description: 'Test Part',
  ncm: '27101932',
  cfop: '5102',
  quantity: new Decimal(1),
  unitPrice: new Decimal(100),
  totalPrice: new Decimal(100),
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  companyId: 'test-company-id',
  serviceOrderId: 'test-service-order-id',
  plugnotasId: 'plugnotas-id-123',
  integrationId: `integration-${counter}`,
  type: InvoiceType.NFE,
  status: InvoiceStatus.PROCESSING,
  accessKey: null,
  invoiceNumber: null,
  series: null,
  pdfUrl: null,
  xmlUrl: null,
  message: null,
  totalAmount: new Decimal(400),
  issuedAt: null,
  cancelledAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

export const createMockPayment = (overrides: Record<string, unknown> = {}) => ({
  id: nextId(),
  companyId: 'test-company-id',
  serviceOrderId: 'test-service-order-id',
  method: PaymentMethod.PIX,
  amount: new Decimal(400),
  paidAt: now,
  notes: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});
