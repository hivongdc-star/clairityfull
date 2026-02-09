export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new AppError(400, code, message);

export const unauthorized = (message: string, code = "UNAUTHORIZED") =>
  new AppError(401, code, message);

export const forbidden = (message: string, code = "FORBIDDEN") =>
  new AppError(403, code, message);

export const notFound = (message: string, code = "NOT_FOUND") =>
  new AppError(404, code, message);

export const internalError = (message: string, code = "INTERNAL_ERROR") =>
  new AppError(500, code, message);
