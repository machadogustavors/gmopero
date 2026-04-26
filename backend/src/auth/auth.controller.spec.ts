import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock; register: jest.Mock; me: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      register: jest.fn(),
      me: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should call authService.login with correct params', async () => {
      const expected = { accessToken: 'token', user: { id: '1' } };
      authService.login.mockResolvedValue(expected);
      const response = { cookie: jest.fn() } as any;

      const result = await controller.login({ email: 'test@test.com', password: 'pass123' }, response);

      expect(authService.login).toHaveBeenCalledWith('test@test.com', 'pass123');
      expect(response.cookie).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ user: expected.user });
    });
  });

  describe('register', () => {
    it('should call authService.register with correct params', async () => {
      const expected = { accessToken: 'token', user: { id: '1' } };
      authService.register.mockResolvedValue(expected);
      const response = { cookie: jest.fn() } as any;

      const result = await controller.register({
        companyName: 'My Shop',
        userName: 'John',
        email: 'john@test.com',
        password: 'pass123',
      }, response);

      expect(authService.register).toHaveBeenCalledWith('My Shop', 'John', 'john@test.com', 'pass123');
      expect(response.cookie).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ user: expected.user });
    });
  });
});
