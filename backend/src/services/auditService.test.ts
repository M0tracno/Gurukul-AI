/**
 * Unit tests for AuditService
 *
 * Tests that security events are correctly logged to the AuditLog collection
 * with all required fields: timestamp, actor identity, action, target resource, and source IP.
 *
 * **Validates: Requirements 12.6**
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditService } from './auditService.js';
import AuditLog from '../models/AuditLog.js';
import type { AuditAction } from '../models/AuditLog.js';

let mongoServer: MongoMemoryServer;
let service: AuditService;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  service = new AuditService();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await AuditLog.deleteMany({});
});

describe('AuditService', () => {
  describe('logEvent', () => {
    it('should create an audit log entry with all required fields', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logEvent({
        userId,
        role: 'Student',
        ip: '192.168.1.100',
        action: 'login',
        resource: 'auth',
        correlationId: 'corr-123-abc',
      });

      const logs = await AuditLog.find({}).lean();
      expect(logs).toHaveLength(1);

      const log = logs[0];
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.actor.userId.toString()).toBe(userId);
      expect(log.actor.role).toBe('Student');
      expect(log.actor.ip).toBe('192.168.1.100');
      expect(log.action).toBe('login');
      expect(log.target.resource).toBe('auth');
      expect(log.correlationId).toBe('corr-123-abc');
    });

    it('should include optional resourceId in target when provided', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const targetId = new mongoose.Types.ObjectId().toString();

      await service.logEvent({
        userId,
        role: 'Admin',
        ip: '10.0.0.1',
        action: 'role_modification',
        resource: 'user',
        resourceId: targetId,
        correlationId: 'corr-456-def',
      });

      const log = await AuditLog.findOne({}).lean();
      expect(log!.target.resource).toBe('user');
      expect(log!.target.resourceId).toBe(targetId);
    });

    it('should include optional metadata when provided', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logEvent({
        userId,
        role: 'Faculty',
        ip: '172.16.0.5',
        action: 'password_change',
        resource: 'auth',
        correlationId: 'corr-789-ghi',
        metadata: { previousHash: 'redacted', initiatedBy: 'self' },
      });

      const log = await AuditLog.findOne({}).lean();
      expect(log!.metadata).toEqual({
        previousHash: 'redacted',
        initiatedBy: 'self',
      });
    });

    it.each([
      'login',
      'logout',
      'password_change',
      'role_modification',
      'failed_auth',
      'account_locked',
    ] as AuditAction[])(
      'should correctly log the "%s" action',
      async (action) => {
        const userId = new mongoose.Types.ObjectId().toString();

        await service.logEvent({
          userId,
          role: 'Student',
          ip: '127.0.0.1',
          action,
          resource: 'auth',
          correlationId: `corr-${action}`,
        });

        const log = await AuditLog.findOne({}).lean();
        expect(log!.action).toBe(action);
      }
    );

    it('should set a timestamp close to the current time', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const before = new Date();

      await service.logEvent({
        userId,
        role: 'Admin',
        ip: '192.168.0.1',
        action: 'logout',
        resource: 'auth',
        correlationId: 'corr-time-check',
      });

      const after = new Date();
      const log = await AuditLog.findOne({}).lean();

      expect(log!.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log!.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store multiple audit events independently', async () => {
      const userId1 = new mongoose.Types.ObjectId().toString();
      const userId2 = new mongoose.Types.ObjectId().toString();

      await service.logEvent({
        userId: userId1,
        role: 'Student',
        ip: '10.0.0.1',
        action: 'login',
        resource: 'auth',
        correlationId: 'corr-1',
      });

      await service.logEvent({
        userId: userId2,
        role: 'Faculty',
        ip: '10.0.0.2',
        action: 'failed_auth',
        resource: 'auth',
        correlationId: 'corr-2',
      });

      const logs = await AuditLog.find({}).lean();
      expect(logs).toHaveLength(2);
      expect(logs[0].actor.userId.toString()).toBe(userId1);
      expect(logs[1].actor.userId.toString()).toBe(userId2);
    });
  });

  describe('logLogin', () => {
    it('should log a login event with correct action and resource', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logLogin(userId, 'Student', '192.168.1.10', 'corr-login-1');

      const log = await AuditLog.findOne({}).lean();
      expect(log!.action).toBe('login');
      expect(log!.target.resource).toBe('auth');
      expect(log!.actor.userId.toString()).toBe(userId);
      expect(log!.actor.role).toBe('Student');
      expect(log!.actor.ip).toBe('192.168.1.10');
      expect(log!.correlationId).toBe('corr-login-1');
    });
  });

  describe('logLogout', () => {
    it('should log a logout event with correct action and resource', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logLogout(userId, 'Faculty', '10.0.0.5', 'corr-logout-1');

      const log = await AuditLog.findOne({}).lean();
      expect(log!.action).toBe('logout');
      expect(log!.target.resource).toBe('auth');
      expect(log!.actor.userId.toString()).toBe(userId);
      expect(log!.actor.role).toBe('Faculty');
      expect(log!.actor.ip).toBe('10.0.0.5');
      expect(log!.correlationId).toBe('corr-logout-1');
    });
  });

  describe('logFailedAuth', () => {
    it('should log a failed auth event with reason in metadata', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logFailedAuth(userId, 'Student', '172.16.0.1', 'corr-fail-1', 'invalid_password');

      const log = await AuditLog.findOne({}).lean();
      expect(log!.action).toBe('failed_auth');
      expect(log!.target.resource).toBe('auth');
      expect(log!.actor.userId.toString()).toBe(userId);
      expect(log!.actor.role).toBe('Student');
      expect(log!.actor.ip).toBe('172.16.0.1');
      expect(log!.correlationId).toBe('corr-fail-1');
      expect(log!.metadata).toEqual({ reason: 'invalid_password' });
    });
  });

  describe('logPasswordChange', () => {
    it('should log a password change event with correct action and resource', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logPasswordChange(userId, 'Admin', '10.0.0.1', 'corr-pwd-1');

      const log = await AuditLog.findOne({}).lean();
      expect(log!.action).toBe('password_change');
      expect(log!.target.resource).toBe('auth');
      expect(log!.actor.userId.toString()).toBe(userId);
      expect(log!.actor.role).toBe('Admin');
      expect(log!.actor.ip).toBe('10.0.0.1');
      expect(log!.correlationId).toBe('corr-pwd-1');
    });
  });

  describe('logRoleModification', () => {
    it('should log a role modification event with target user and new role', async () => {
      const actorId = new mongoose.Types.ObjectId().toString();
      const targetUserId = new mongoose.Types.ObjectId().toString();

      await service.logRoleModification(actorId, 'Admin', '192.168.0.1', 'corr-role-1', targetUserId, 'Faculty');

      const log = await AuditLog.findOne({}).lean();
      expect(log!.action).toBe('role_modification');
      expect(log!.target.resource).toBe('user');
      expect(log!.target.resourceId).toBe(targetUserId);
      expect(log!.actor.userId.toString()).toBe(actorId);
      expect(log!.actor.role).toBe('Admin');
      expect(log!.actor.ip).toBe('192.168.0.1');
      expect(log!.correlationId).toBe('corr-role-1');
      expect(log!.metadata).toEqual({ newRole: 'Faculty' });
    });
  });

  describe('logAccountLocked', () => {
    it('should log an account locked event with correct action and resource', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await service.logAccountLocked(userId, 'Student', '10.10.10.10', 'corr-lock-1');

      const log = await AuditLog.findOne({}).lean();
      expect(log!.action).toBe('account_locked');
      expect(log!.target.resource).toBe('auth');
      expect(log!.actor.userId.toString()).toBe(userId);
      expect(log!.actor.role).toBe('Student');
      expect(log!.actor.ip).toBe('10.10.10.10');
      expect(log!.correlationId).toBe('corr-lock-1');
    });
  });
});
