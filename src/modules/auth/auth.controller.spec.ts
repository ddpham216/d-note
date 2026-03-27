import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Test } from '@nestjs/testing';

const mockUser = {
  id: 'user-123',
  email: 'test@gmail.com',
};

const mockTokens = {
  access_token: 'access-token-xyz',
  refresh_token: 'refresh-token-abc',
  expires_in: 3600,
  token_type: 'Bearer',
};

const mockLoginResult = {
  statusCode: 200,
  message: 'Success',
  data: mockTokens,
  timestamp: '2025-12-10T10:51:29.326Z',
};

const mockAuthService = {
  validateUser: jest.fn().mockImplementation(() => mockUser),
  login: jest.fn().mockImplementation(() => mockTokens),
  logout: jest.fn().mockImplementation(() => undefined),
  refresh: jest.fn().mockImplementation(() => mockTokens),
};

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('login', () => {
    it('returns login result on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@gmail.com',
        password: 'password123',
      };

      mockAuthService.validateUser.mockResolvedValueOnce(mockUser);
      mockAuthService.login.mockResolvedValueOnce(mockLoginResult);

      const result = await authController.login(loginDto);

      const validateUserSpy = jest.spyOn(authService, 'validateUser');
      const loginSpy = jest.spyOn(authService, 'login');

      expect(validateUserSpy).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(loginSpy).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResult);
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      const loginDto: LoginDto = {
        email: 'test@gmail.com',
        password: 'wrong-password',
      };

      mockAuthService.validateUser.mockResolvedValueOnce(null);

      await expect(authController.login(loginDto)).rejects.toHaveProperty(
        'status',
        401,
      );
    });
  });

  describe('logout', () => {
    it('calls authService.logout with correct parameters', async () => {
      const mockJwtPayload: JwtPayload = {
        sub: mockUser.id,
        email: mockUser.email,
      };
      const logoutDto: LogoutDto = {
        refresh_token: 'refresh-token-abc',
      };

      await authController.logout(mockJwtPayload, logoutDto);

      const logoutSpy = jest.spyOn(authService, 'logout');
      expect(logoutSpy).toHaveBeenCalledWith(
        mockUser.id,
        logoutDto.refresh_token,
      );
    });
  });

  describe('refreshToken', () => {
    it('returns new tokens on successful refresh', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refresh_token: 'refresh-token-abc',
      };

      mockAuthService.refresh.mockResolvedValueOnce(mockTokens);

      const result = await authController.refreshToken(refreshTokenDto);

      const refreshSpy = jest.spyOn(authService, 'refresh');
      expect(refreshSpy).toHaveBeenCalledWith(refreshTokenDto.refresh_token);
      expect(result).toEqual(mockTokens);
    });
  });
});
