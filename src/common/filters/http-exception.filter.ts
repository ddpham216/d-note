import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseObject {
  statusCode: number;
  message: string | string[];
  error?: string;
  errorCode?: string;
  args?: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: '',
      errorCode: undefined as string | undefined,
      args: undefined as unknown,
    };

    if (typeof exceptionResponse === 'string') {
      errorBody.message = exceptionResponse;
    } else {
      const resObj = exceptionResponse as ErrorResponseObject;

      if (Array.isArray(resObj.message)) {
        errorBody.message = resObj.message.join(', ');
      } else {
        errorBody.message = resObj.message || exception.message;
      }

      errorBody.errorCode = resObj.errorCode;
      errorBody.args = resObj.args;
    }

    response.status(status).json(errorBody);
  }
}
