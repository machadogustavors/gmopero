import { UserRole } from '@prisma/client';

export const mockPrismaService = () => {
  const createModelMock = () => ({
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  });

  return {
    company: createModelMock(),
    user: createModelMock(),
    customer: createModelMock(),
    vehicle: createModelMock(),
    serviceOrder: createModelMock(),
    serviceOrderItem: createModelMock(),
    payment: createModelMock(),
    $transaction: jest.fn((fn) => fn(mockPrismaService())),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
};

export type MockPrismaService = ReturnType<typeof mockPrismaService>;

export const mockCurrentUser = (overrides: Partial<{ userId: string; companyId: string; role: UserRole }> = {}) => ({
  userId: overrides.userId ?? 'test-user-id',
  companyId: overrides.companyId ?? 'test-company-id',
  role: overrides.role ?? UserRole.OWNER,
});
