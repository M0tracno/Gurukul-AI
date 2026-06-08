/**
 * Shared feature module types
 * Common types used across multiple feature modules
 */

/** Pagination parameters for list queries */
export interface PaginationParams {
  [key: string]: unknown;
  page: number;
  pageSize: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Generic API error response */
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, string>;
}

/** Loading state for async operations */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/** Common table column definition */
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
}

/** Form field validation result */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}
