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

export interface IAuditService {
  logEvent(params: AuditEventParams): Promise<void>;
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
   * failed auth, and account lockout events.
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
