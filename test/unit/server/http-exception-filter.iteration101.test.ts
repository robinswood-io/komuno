import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../../../server/src/common/filters/http-exception.filter';
import { logger } from '../../../server/lib/logger';

type RequestShape = {
  method: string;
  path: string;
  query: unknown;
  body: unknown;
};

type ResponseShape = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createResponse = (): ResponseShape => {
  const response: ResponseShape = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
};

const createHost = (request: RequestShape, response: ResponseShape): ArgumentsHost => {
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response, getNext: () => undefined }),
  } as unknown as ArgumentsHost;
};

describe('http-exception.filter iteration 101', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('préserve les champs non sensibles et les null imbriqués', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = {
      method: 'POST',
      path: '/api/tasks/search',
      query: { q: 'planning' },
      body: {
        details: {
          title: 'Roadmap',
          count: 2,
          nestedNull: null,
        },
      },
    };

    filter.catch(new HttpException('Bad request', HttpStatus.BAD_REQUEST), createHost(request, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const body = metadata.body as {
      details: {
        title: string;
        count: number;
        nestedNull: null;
      };
    };
    const query = metadata.query as Record<string, unknown>;

    expect(query.q).toBe('planning');
    expect(body.details.title).toBe('Roadmap');
    expect(body.details.count).toBe(2);
    expect(body.details.nestedNull).toBeNull();
  });
});
