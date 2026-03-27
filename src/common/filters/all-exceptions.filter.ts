import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

interface ApiErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | object;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        errorMessage = (response as Record<string, unknown>).message as
          | string
          | object;
      } else {
        errorMessage = response;
      }
    }

    const responseBody: ApiErrorResponse = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()) as string,
      message: errorMessage,
    };

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Exception thrown at ${responseBody.path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `Business Error: ${JSON.stringify(responseBody.message)}`,
      );
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
