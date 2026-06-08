export interface ApiErrorResponse {
  error: string; // Machine-readable code: "VALIDATION_ERROR", "NOT_FOUND", etc.
  message: string; // Human-readable description
  details?: Array<{
    field: string;
    value: unknown;
    reason: string;
  }>;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
