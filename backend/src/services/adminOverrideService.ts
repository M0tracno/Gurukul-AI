import { AppError } from '../middleware/errorHandler.js';
import { auditService } from './auditService.js';
import { authorizationService } from './authorizationService.js';
import type { UserRole } from '../types/common.js';

/**
 * Parameters for an admin override mutation.
 */
export interface AdminOverrideParams {
  /** The admin user ID performing the override. */
  actor: string;
  /** The role of the requesting user (must be 'admin'). */
  role: UserRole;
  /** A description of the action being performed (e.g., 'update_mark', 'modify_enrollment'). */
  action: string;
  /** The target record identifier being modified. */
  target: string;
  /** Optional additional metadata about the override. */
  metadata?: Record<string, unknown>;
}

/**
 * Admin Override Service
 *
 * Wraps admin override mutations to:
 * 1. Verify the requestor is an admin (via authorizationService.isAdmin)
 * 2. Execute the mutation
 * 3. Record an audit entry via auditService.record({ actor, action, target, timestamp })
 *
 * This satisfies Requirements 4.2, 4.3, 4.9, and 22.3:
 * - Admin is permitted to modify records across all modules (4.2, 4.3)
 * - Every admin override writes an AuditLog entry recording actor, action, target, timestamp (4.9, 22.3)
 */
export class AdminOverrideService {
  /**
   * Execute an admin override mutation with audit recording.
   *
   * The mutation function is called only if the actor has the admin role.
   * After successful execution, an AuditLog entry is persisted with
   * { actor, action, target, timestamp }.
   *
   * @param params - The override parameters (actor, role, action, target)
   * @param mutation - The async function to execute as the override
   * @returns The result of the mutation function
   * @throws AppError.forbidden if the actor is not an admin
   */
  async executeOverride<T>(
    params: AdminOverrideParams,
    mutation: () => Promise<T>,
  ): Promise<T> {
    // Verify the requestor is an admin — defence in depth
    if (!authorizationService.isAdmin(params.role)) {
      throw AppError.forbidden(
        'Only administrators can perform override actions',
      );
    }

    // Execute the mutation
    const result = await mutation();

    // Record the audit entry per Requirements 4.9 and 22.3
    await auditService.record({
      actor: params.actor,
      action: params.action,
      target: params.target,
      timestamp: new Date(),
      metadata: params.metadata,
    });

    return result;
  }
}

// Export a singleton instance for convenience
export const adminOverrideService = new AdminOverrideService();
