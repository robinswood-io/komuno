import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from './http-exception.filter';

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('../../../lib/logger', () => ({
  logger: loggerMocks,
}));

vi.mock('nanoid', () => ({
  nanoid: () => 'test-error-id',
}));

type MockRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  body: Record<string, string>;
  user?: { email: string };
};

type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createResponse = (): MockResponse => {
  const response: MockResponse = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);

  return response;
};

const createArgumentsHost = (
  request: MockRequest,
  response: MockResponse,
): ArgumentsHost => {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
};

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  it('returns expected payload for HttpException', () => {
    const filter = new HttpExceptionFilter();
    const request: MockRequest = {
      method: 'POST',
      path: '/api/ideas',
      query: {},
      body: { title: 'new idea' },
      user: { email: 'user@example.com' },
    };
    const response = createResponse();
    const host = createArgumentsHost(request, response);

    const exception = new HttpException('Validation failed', HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      errorId: 'test-error-id',
    });
    expect(loggerMocks.error).toHaveBeenCalledTimes(1);
  });

  it('returns expected payload for generic Error', () => {
    const filter = new HttpExceptionFilter();
    const request: MockRequest = {
      method: 'GET',
      path: '/api/ideas',
      query: { page: '1' },
      body: {},
    };
    const response = createResponse();
    const host = createArgumentsHost(request, response);

    const exception = new Error('Unexpected failure');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unexpected failure',
      errorId: 'test-error-id',
    });
    expect(loggerMocks.error).toHaveBeenCalledTimes(1);
  });
});
