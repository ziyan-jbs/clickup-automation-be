import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { customAlphabet } from "nanoid";

import { AppConstants } from "@/common/constants/app.constants";
import { requestContext } from "@/common/context/request-context";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 16);
const REQUEST_ID_PATTERN = /^[\w-]{8,64}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(AppConstants.REQUEST_ID_HEADER);
    const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : nanoid();

    res.setHeader("X-Request-Id", requestId);

    requestContext.run(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.header("user-agent"),
      },
      next,
    );
  }
}
