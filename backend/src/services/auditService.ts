import AuditLog from '../models/AuditLog.js';
import type { AuditAction } from '../models/AuditLog.js';

export interface AuditEventParams {
  userId: string;
  role: string;
  ip: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured entry for the design-spec `record` method.
 * Matches the contract: `auditService.record({ actor, action, target, timestamp })`
 * as described in the design (Requirement 4.9, 22.3).
 */
export interface AuditRecordEntry {
  actor: string;
  action: string;
  target: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IAuditService {
  logEvent(params: AuditEventParams): Promise<void>;
  record(entry: AuditRecordEntry): Promise<void>;
  logLogin(userId: string, role: string, ip: string, correlationId: string): Promise<void>;
  logLogout(userId: string, role: string, ip: string, correlationId: string): Promise<void>;
  logFailedAuth(userId: string, role: string, ip: string, correlationId: string, reason: string): Promise<void>;
  logPasswordChange(userId: string, role: string, ip: string, correlationId: string): Promise<void>;
  logRoleModification(userId: string, role: string, ip: string, correlationId: string, targetUserId: string, newRole: string): Promise<void>;
  logAccountLocked(userId: string, role: string, ip: string, correlationId: string): Promise<void>;
}

export class AuditService implements IAuditService {
  /**
   * Log a security-relevant event to the AuditLog collection.
   *
   * Tracks: login, logout, password change, role modification,
   * failed auth, account lockout, and admin override events.
   */
  async logEvent(params: AuditEventParams): Promise<void> {
    await AuditLog.create({
      timestamp: new Date(),
      actor: {
        userId: params.userId,
        role: params.role,
        ip: params.ip,
      },
      action: params.action,
      target: {
        resource: params.resource,
        resourceId: params.resourceId,
      },
      correlationId: params.correlationId,
      metadata: params.metadata,
    });
  }

  /**
   * Record an audit entry using the design-spec interface.
   * Matches the contract: `auditService.record({ actor, action, target, timestamp })`
   *
   * This method is used by admin override mutations to produce audit entries
   * per Requirements 4.9 and 22.3.
   */
  async record(entry: AuditRecordEntry): Promise<void> {
    await AuditLog.create({
      timestamp: entry.timestamp,
      actor: {
        userId: entry.actor,
        role: 'admin',
        ip: 'system',
      },
      action: 'admin_override',
      target: {
        resource: entry.action,
        resourceId: entry.target,
      },
      correlationId: `override-${Date.now()}`,
      metadata: entry.metadata,
    });
  }

  /**
   * Log a successful login event.
   */
  async logLogin(userId: string, role: string, ip: string, correlationId: string): Promise<void> {
    await this.logEvent({
      userId,
      role,
      ip,
      action: 'login',
      resource: 'auth',
      correlationId,
    });
  }

  /**
   * Log a logout event.
   */
  async logLogout(userId: string, role: string, ip: string, correlationId: string): Promise<void> {
    await this.logEvent({
      userId,
      role,
      ip,
      action: 'logout',
      resource: 'auth',
      correlationId,
    });
  }

  /**
   * Log a failed authentication attempt.
   */
  async logFailedAuth(userId: string, role: string, ip: string, correlationId: string, reason: string): Promise<void> {
    await this.logEvent({
      userId,
      role,
      ip,
      action: 'failed_auth',
      resource: 'auth',
      correlationId,
      metadata: { reason },
    });
  }

  /**
   * Log a password change event.
   */
  async logPasswordChange(userId: string, role: string, ip: string, correlationId: string): Promise<void> {
    await this.logEvent({
      userId,
      role,
      ip,
      action: 'password_change',
      resource: 'auth',
      correlationId,
    });
  }

  /**
   * Log a role modification event.
   */
  async logRoleModification(userId: string, role: string, ip: string, correlationId: string, targetUserId: string, newRole: string): Promise<void> {
    await this.logEvent({
      userId,
      role,
      ip,
      action: 'role_modification',
      resource: 'user',
      resourceId: targetUserId,
      correlationId,
      metadata: { newRole },
    });
  }

  /**
   * Log an account lockout event.
   */
  async logAccountLocked(userId: string, role: string, ip: string, correlationId: string): Promise<void> {
    await this.logEvent({
      userId,
      role,
      ip,
      action: 'account_locked',
      resource: 'auth',
      correlationId,
    });
  }
}

// Export a singleton instance for convenience
export const auditService = new AuditService();
