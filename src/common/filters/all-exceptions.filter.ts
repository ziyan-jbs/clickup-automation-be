import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";
import { getRequestId } from "@/common/context/request-context";
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof detail === "object" && detail && "message" in detail
        ? (detail as { message: unknown }).message
        : "Internal server error";
    response.status(status).json({
      statusCode: status,
      message,
      requestId: getRequestId(),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
