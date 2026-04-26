import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const createMockExecutionContext = (
  user: { userId: string; companyId: string; role: string } | null = null,
  params: Record<string, string> = {},
  body: Record<string, unknown> = {},
  query: Record<string, unknown> = {},
): ExecutionContext => {
  const request = {
    user,
    params,
    body,
    query,
    headers: {},
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn() as any,
    getArgs: () => [request],
    getArgByIndex: (index: number) => [request][index],
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
    getType: () => 'http' as any,
  } as ExecutionContext;
};

export const createMockAuthGuard = (
  user: { userId: string; companyId: string; role: string } = {
    userId: 'test-user-id',
    companyId: 'test-company-id',
    role: UserRole.OWNER,
  },
) => ({
  canActivate: jest.fn((context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    request.user = user;
    return true;
  }),
});
