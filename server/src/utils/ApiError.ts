export class ApiError extends Error {
  public statusCode: number;
  public success: boolean;
  public errors: any;
  public code: string;

  constructor(
    statusCode: number,
    message: string = 'Something went wrong',
    errors: any = {},
    code: string = 'INTERNAL_ERROR',
    stack: string = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.code = code;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, errors: any = {}, code: string = 'BAD_REQUEST') {
    return new ApiError(400, message, errors, code);
  }

  static unauthorized(message: string = 'Unauthorized access', code: string = 'UNAUTHORIZED') {
    return new ApiError(401, message, {}, code);
  }

  static forbidden(message: string = 'Access forbidden', code: string = 'FORBIDDEN') {
    return new ApiError(403, message, {}, code);
  }

  static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    return new ApiError(404, message, {}, code);
  }

  static conflict(message: string = 'Resource conflict', code: string = 'CONFLICT') {
    return new ApiError(409, message, {}, code);
  }

  static internal(message: string = 'Internal server error', code: string = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(500, message, {}, code);
  }

  static serviceUnavailable(message: string = 'Service temporarily unavailable', code: string = 'SERVICE_UNAVAILABLE') {
    return new ApiError(533, message, {}, code);
  }

  static gatewayTimeout(message: string = 'Gateway timeout', code: string = 'GATEWAY_TIMEOUT') {
    return new ApiError(504, message, {}, code);
  }
}
