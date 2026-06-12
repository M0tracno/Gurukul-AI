/**
 * Canonical API response envelope helpers and types.
 *
 * Every API response across all resource namespaces converges on one of two
 * shapes so that clients can handle data and errors uniformly:
 *
 *  - Success: `{ success: true, data, meta? }`
 *  - Error:   `{ success: false, message, details? }`
 *
 * The `success` boolean is the discriminator that lets callers narrow the
 * union (`ResponseEnvelope<T>`) without inspecting payload shape.
 *
 * @see Requirements 2.1, 2.2
 */

/**
 * Pagination metadata carried alongside a successful payload.
 */
export interface EnvelopeMeta {
  page?: number;
  limit?: number;
  total?: number;
  /**
   * Distinguishes a Conversation that exists but has no viewable (non-deleted)
   * messages (`true`) from a `conversationId` that matches no message at all
   * (`false`). Carried by the message-thread endpoint only.
   *
   * @see Requirement 2.7
   */
  conversationExists?: boolean;
}

/**
 * A single field-level validation failure surfaced to the client.
 */
export interface ErrorDetail {
  field: string;
  reason: string;
}

/**
 * Standardized success response: `{ success: true, data, meta? }`.
 */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: EnvelopeMeta;
}

/**
 * Standardized error response: `{ success: false, message, details? }`.
 */
export interface ErrorEnvelope {
  success: false;
  message: string;
  details?: ErrorDetail[];
}

/**
 * Discriminated union of every possible API response shape.
 */
export type ResponseEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

/**
 * Build a {@link SuccessEnvelope} for a successful endpoint outcome.
 *
 * `meta` is only included when provided, keeping responses minimal for
 * endpoints that do not paginate.
 *
 * @param data - The response payload.
 * @param meta - Optional pagination metadata.
 * @returns A success envelope wrapping `data`.
 */
export function success<T>(data: T, meta?: EnvelopeMeta): SuccessEnvelope<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Build an {@link ErrorEnvelope} for an error outcome.
 *
 * `details` is only included when provided, so non-validation errors omit the
 * field entirely.
 *
 * @param message - Human-readable error description.
 * @param details - Optional field-level error descriptions.
 * @returns An error envelope.
 */
export function failure(message: string, details?: ErrorDetail[]): ErrorEnvelope {
  return {
    success: false,
    message,
    ...(details && { details }),
  };
}
