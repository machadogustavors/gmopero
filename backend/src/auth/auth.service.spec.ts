import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, createMockUser } from '../common/test';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = mockPrismaService();
    jwtService = { signAsync: jest.fn().mockResolvedValue('test-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user on valid credentials', async () => {
      const mockUser = createMockUser({
        id: 'user-1',
        email: 'test@test.com',
        companyId: 'company-1',
        role: UserRole.OWNER,
        passwordHash: 'hashed-password',
      });

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@test.com', 'password123');

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.role).toBe(UserRole.OWNER);
      expect(result.user.companyId).toBe('company-1');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        user_id: 'user-1',
        company_id: 'company-1',
        role: UserRole.OWNER,
      });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('notfound@test.com', 'password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const mockUser = createMockUser();
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@test.com', 'wrongpass'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create company and owner user, return token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const mockCompany = { id: 'company-1', name: 'My Shop' };
      const mockUser = createMockUser({
        id: 'user-1',
        name: 'John',
        email: 'john@test.com',
        companyId: 'company-1',
        role: UserRole.OWNER,
      });

      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          company: { create: jest.fn().mockResolvedValue(mockCompany) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
        };
        return fn(tx);
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register('My Shop', 'John', 'john@test.com', 'password123');

      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user.email).toBe('john@test.com');
      expect(result.user.role).toBe(UserRole.OWNER);
      expect(result.user.companyId).toBe('company-1');
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(createMockUser());

      await expect(
        service.register('Shop', 'John', 'existing@test.com', 'password'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
