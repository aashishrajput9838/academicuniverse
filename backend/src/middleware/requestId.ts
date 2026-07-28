import { Request, Response, NextFunction } from 'express';
import { randomUUID as uuidv4 } from 'crypto';

const REQUEST_ID_HEADER = 'X-Request-ID';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers[REQUEST_ID_HEADER.toLowerCase()] as string || uuidv4();
  
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  
  next();
};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
