import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

import { getRequestId } from "@/common/context/request-context";
import { ClickUpApiError } from "@/providers/clickup/clickup-api.types";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : exception instanceof ClickUpApiError
        ? HttpStatus.BAD_GATEWAY
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const responseMessage = typeof exceptionResponse === "object" && exceptionResponse && "message" in exceptionResponse
      ? (exceptionResponse as { message: string | string[] }).message
      : null;
    const message = responseMessage || (exception instanceof ClickUpApiError ? exception.message : "Internal server error");

    const payload = {
      statusCode: status,
      message,
      requestId: getRequestId(),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }
}
