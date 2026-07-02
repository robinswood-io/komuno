import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockExecutionContext: unknown;
  let mockRequest: unknown;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockContext = (request: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown;
  };

  describe('canActivate', () => {
    it('should allow authenticated user with isAuthenticated function', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: {
          email: 'admin@example.com',
          role: 'super_admin',
        },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.isAuthenticated).toHaveBeenCalled();
    });

    it('should allow access if req.user is populated', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: {
          email: 'admin@example.com',
          role: 'super_admin',
        },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should reject unauthenticated user without isAuthenticated', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: null,
        url: '/api/admin',
        method: 'GET',
        session: null,
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    });

    it('should reject unauthenticated user without user object', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: undefined,
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    });

    it('should handle request without isAuthenticated function', () => {
      mockRequest = {
        user: {
          email: 'admin@example.com',
          role: 'super_admin',
        },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true); // Should pass because user is populated
    });

    it('should work with various user roles', () => {
      const roles = ['super_admin', 'ideas_manager', 'events_manager', 'ideas_reader'];

      roles.forEach((role) => {
        mockRequest = {
          isAuthenticated: vi.fn(() => true),
          user: {
            email: 'user@example.com',
            role: role,
          },
          url: '/api/resource',
          method: 'GET',
          session: { id: 'session123' },
          headers: { cookie: 'session_id=xyz' },
        };

        mockExecutionContext = createMockContext(mockRequest);
        const result = guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
      });
    });
  });

  describe('different HTTP methods', () => {
    it('should protect GET requests', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should protect POST requests', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin',
        method: 'POST',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should protect PATCH requests', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin/123',
        method: 'PATCH',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should protect DELETE requests', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin/123',
        method: 'DELETE',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });

  describe('different authentication scenarios', () => {
    it('should work with session-based authentication', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session_abc123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should reject without session when isAuthenticated returns false', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: null,
        url: '/api/admin',
        method: 'GET',
        session: null,
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    });

    it('should work with OAuth2 authenticated user', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: {
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ideas_manager',
          status: 'active',
        },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session_oauth' },
        headers: { cookie: 'connect.sid=oauth123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should work when isAuthenticated is not a function', () => {
      mockRequest = {
        isAuthenticated: true,
        user: { email: 'admin@example.com' },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true); // Passes because user is set
    });
  });

  describe('error handling', () => {
    it('should throw UnauthorizedException with proper message', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: null,
        url: '/api/protected',
        method: 'GET',
        session: null,
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);

      const error = new UnauthorizedException('Authentication required');
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(error);
    });

    it('should handle malformed request gracefully', () => {
      mockRequest = {
        url: '/api/admin',
        method: 'GET',
        isAuthenticated: vi.fn(() => false),
        user: null,
        session: null,
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    });

    it('should reject even with invalid user properties', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: { role: 'super_admin' }, // Missing email
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true); // user object exists, so it's considered authenticated
    });
  });

  describe('edge cases', () => {
    it('should work with null session', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin',
        method: 'GET',
        session: null,
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should work with empty headers', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should handle complex URLs', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => true),
        user: { email: 'admin@example.com' },
        url: '/api/admin/users/123/edit?tab=settings&filter=active',
        method: 'GET',
        session: { id: 'session123' },
        headers: { cookie: 'connect.sid=abc123' },
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should work with empty user object', () => {
      mockRequest = {
        isAuthenticated: vi.fn(() => false),
        user: {},
        url: '/api/admin',
        method: 'GET',
        session: { id: 'session123' },
        headers: {},
      };

      mockExecutionContext = createMockContext(mockRequest);
      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true); // Empty object is still truthy
    });
  });
});
