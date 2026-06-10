/**
 * Example tests: admin account-management success status codes and the
 * standard error envelope for authentication / authorization failures.
 *
 * Feature: secure-admin-user-management, Property 24: Error responses conform
 * to the standard envelope.
 *
 * Property 24: For any error outcome, the response body SHALL match the
 * standard error envelope `{ success: false, message }` carrying a
 * human-readable message and a machine-readable code, and SHALL use HTTP 401
 * for missing/invalid authentication and 403 for insufficient role.
 *
 * The application's canonical error envelope (`utils/envelope.ts` →
 * `failure(message, details?)`) serializes `{ success: false, message }`; the
 * HTTP status code is the machine-readable code carried by the response (401
 * for missing/invalid auth, 403 for insufficient role), produced by
 * `AppError` via the `globalErrorHandler`. These example tests assert one
 * success example per admin operation (the request reaches the handler and
 * returns its 2xx after the service completes) plus the 401/403 envelopes.
 *
 * **Validates: Requirements 12.4, 12.5**
 * **Also validates: Requirement 2.3** (admin reaches handler, 2xx after the
 * operation completes successfully).
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import express, { type Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// authMiddleware validates a real JWT; set the secret before any import that
// reads it.
const JWT_SECRET = 'test-secret-admin-account-status-codes';
process.env.JWT_SECRET = JWT_SECRET;

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------
// These example tests exercise the controller → HTTP status mapping and the
// auth/RBAC middleware chain, not the service business logic (which has its
// own property tests). The services are mocked so each admin operation
// "completes successfully" and the controller returns its 2xx envelope.

const studentResponse = {
  _id: '507f1f77bcf86cd799439011',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@school.edu',
  studentId: 'STU-001',
  grade: '10',
  active: true,
  createdAt: new Date().toISOString(),
};

const facultyResponse = {
  _id: '507f1f77bcf86cd799439022',
  firstName: 'Alan',
  lastName: 'Turing',
  email: 'alan@school.edu',
  employeeId: 'EMP-001',
  department: 'Computer Science',
  title: 'Professor',
  active: true,
  isAdmin: false,
  role: 'faculty',
  createdAt: new Date().toISOString(),
};

function buildServiceMock(response: typeof studentResponse | typeof facultyResponse) {
  return {
    list: jest.fn(async () => ({
      data: [response],
      meta: { page: 1, limit: 20, total: 1 },
    })),
    createWithCredentials: jest.fn(async () => ({
      account: response,
      setupLinkSent: true,
    })),
    updateAccount: jest.fn(async () => response),
    deactivate: jest.fn(async () => undefined),
    reactivate: jest.fn(async () => ({ ...response, active: true })),
    resetPassword: jest.fn(async () => ({ setupLinkSent: true })),
  };
}

const studentServiceMock = buildServiceMock(studentResponse);
const facultyServiceMock = buildServiceMock(facultyResponse);

jest.unstable_mockModule('../../services/studentService.js', () => ({
  studentService: studentServiceMock,
  StudentService: class {},
}));

jest.unstable_mockModule('../../services/facultyService.js', () => ({
  facultyService: facultyServiceMock,
  FacultyService: class {},
}));

// ---------------------------------------------------------------------------
// App assembly (imports deferred until after mocks are registered)
// ---------------------------------------------------------------------------

let app: Express;
let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  const { studentController } = await import('../studentController.js');
  const { facultyController } = await import('../facultyController.js');
  const { authMiddleware } = await import('../../middleware/authMiddleware.js');
  const { adminOnly, requireRoles } = await import('../../middleware/rbacMiddleware.js');
  const { globalErrorHandler } = await import('../../middleware/errorHandler.js');

  app = express();
  app.use(express.json());

  // Canonical admin-management chain: authMiddleware → role middleware →
  // controller. (Validation is exercised elsewhere; omitted here so the focus
  // stays on auth/RBAC status codes and handler reachability.)
  const students = express.Router();
  students.get('/', authMiddleware, requireRoles('admin', 'teacher'), studentController.getAll);
  students.post('/', authMiddleware, adminOnly, studentController.create);
  students.put('/:id', authMiddleware, adminOnly, studentController.update);
  students.delete('/:id', authMiddleware, adminOnly, studentController.remove);
  students.post('/:id/reactivate', authMiddleware, adminOnly, studentController.reactivate);
  students.post('/:id/password-reset', authMiddleware, adminOnly, studentController.passwordReset);
  app.use('/api/students', students);

  const faculty = express.Router();
  faculty.get('/', authMiddleware, requireRoles('admin', 'teacher'), facultyController.getAll);
  faculty.post('/', authMiddleware, adminOnly, facultyController.create);
  faculty.put('/:id', authMiddleware, adminOnly, facultyController.update);
  faculty.delete('/:id', authMiddleware, adminOnly, facultyController.remove);
  faculty.post('/:id/reactivate', authMiddleware, adminOnly, facultyController.reactivate);
  faculty.post('/:id/password-reset', authMiddleware, adminOnly, facultyController.passwordReset);
  app.use('/api/faculty', faculty);

  app.use(globalErrorHandler);

  adminToken = jwt.sign({ userId: 'admin-1', role: 'admin' }, JWT_SECRET, { expiresIn: '15m' });
  studentToken = jwt.sign({ userId: 'stu-1', role: 'student' }, JWT_SECRET, { expiresIn: '15m' });
});

beforeEach(() => {
  jest.clearAllMocks();
});

const bearer = (token: string) => `Bearer ${token}`;

// ---------------------------------------------------------------------------
// Admin reaches the handler and receives the operation's 2xx (Requirement 2.3)
// ---------------------------------------------------------------------------
// Feature: secure-admin-user-management, Property 24
describe('Admin account operations return their success status after completion', () => {
  it('list students returns 200 with a success envelope', async () => {
    const resp = await request(app).get('/api/students').set('Authorization', bearer(adminToken));

    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(studentServiceMock.list).toHaveBeenCalledTimes(1);
  });

  it('create student returns 201 with a success envelope', async () => {
    const resp = await request(app)
      .post('/api/students')
      .set('Authorization', bearer(adminToken))
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@school.edu',
        studentId: 'STU-001',
        grade: '10',
        credentialDeliveryMethod: 'setup_link',
      });

    expect(resp.status).toBe(201);
    expect(resp.body.success).toBe(true);
    expect(studentServiceMock.createWithCredentials).toHaveBeenCalledTimes(1);
  });

  it('update student returns 200 with a success envelope', async () => {
    const resp = await request(app)
      .put('/api/students/507f1f77bcf86cd799439011')
      .set('Authorization', bearer(adminToken))
      .send({ firstName: 'Augusta' });

    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(studentServiceMock.updateAccount).toHaveBeenCalledTimes(1);
  });

  it('deactivate (delete) student returns 200 with a success envelope', async () => {
    const resp = await request(app)
      .delete('/api/students/507f1f77bcf86cd799439011')
      .set('Authorization', bearer(adminToken));

    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(studentServiceMock.deactivate).toHaveBeenCalledTimes(1);
  });

  it('reactivate student returns 200 with a success envelope', async () => {
    const resp = await request(app)
      .post('/api/students/507f1f77bcf86cd799439011/reactivate')
      .set('Authorization', bearer(adminToken));

    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(studentServiceMock.reactivate).toHaveBeenCalledTimes(1);
  });

  it('password-reset student returns 200 with a success envelope', async () => {
    const resp = await request(app)
      .post('/api/students/507f1f77bcf86cd799439011/password-reset')
      .set('Authorization', bearer(adminToken))
      .send({ credentialDeliveryMethod: 'setup_link' });

    expect(resp.status).toBe(200);
    expect(resp.body.success).toBe(true);
    expect(studentServiceMock.resetPassword).toHaveBeenCalledTimes(1);
  });

  it('faculty operations each return their success status (201 create, 200 others)', async () => {
    const list = await request(app).get('/api/faculty').set('Authorization', bearer(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);

    const create = await request(app)
      .post('/api/faculty')
      .set('Authorization', bearer(adminToken))
      .send({
        firstName: 'Alan',
        lastName: 'Turing',
        email: 'alan@school.edu',
        employeeId: 'EMP-001',
        department: 'Computer Science',
        credentialDeliveryMethod: 'setup_link',
      });
    expect(create.status).toBe(201);
    expect(create.body.success).toBe(true);

    const update = await request(app)
      .put('/api/faculty/507f1f77bcf86cd799439022')
      .set('Authorization', bearer(adminToken))
      .send({ title: 'Lecturer' });
    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);

    const remove = await request(app)
      .delete('/api/faculty/507f1f77bcf86cd799439022')
      .set('Authorization', bearer(adminToken));
    expect(remove.status).toBe(200);
    expect(remove.body.success).toBe(true);

    const reactivate = await request(app)
      .post('/api/faculty/507f1f77bcf86cd799439022/reactivate')
      .set('Authorization', bearer(adminToken));
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.success).toBe(true);

    const reset = await request(app)
      .post('/api/faculty/507f1f77bcf86cd799439022/password-reset')
      .set('Authorization', bearer(adminToken))
      .send({ credentialDeliveryMethod: 'setup_link' });
    expect(reset.status).toBe(200);
    expect(reset.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error envelope: 401 for missing/invalid authentication (Requirements 12.4, 12.5)
// ---------------------------------------------------------------------------
// Feature: secure-admin-user-management, Property 24
describe('Unauthenticated requests are rejected with a 401 standard error envelope', () => {
  it('a missing Authorization header yields 401 with { success:false, message }', async () => {
    const resp = await request(app).post('/api/students').send({});

    // HTTP status code is the machine-readable code (401 = missing/invalid auth).
    expect(resp.status).toBe(401);
    expect(resp.body.success).toBe(false);
    expect(typeof resp.body.message).toBe('string');
    expect(resp.body.message.length).toBeGreaterThan(0);
    // The handler must not run.
    expect(studentServiceMock.createWithCredentials).not.toHaveBeenCalled();
  });

  it('a malformed Authorization header yields 401 with the standard envelope', async () => {
    const resp = await request(app)
      .post('/api/students')
      .set('Authorization', 'NotBearer abc.def.ghi')
      .send({});

    expect(resp.status).toBe(401);
    expect(resp.body.success).toBe(false);
    expect(typeof resp.body.message).toBe('string');
    expect(resp.body.message.length).toBeGreaterThan(0);
    expect(studentServiceMock.createWithCredentials).not.toHaveBeenCalled();
  });

  it('an invalid/tampered token yields 401 with the standard envelope', async () => {
    const resp = await request(app)
      .get('/api/faculty')
      .set('Authorization', bearer('not-a-real-jwt'));

    expect(resp.status).toBe(401);
    expect(resp.body.success).toBe(false);
    expect(typeof resp.body.message).toBe('string');
    expect(facultyServiceMock.list).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Error envelope: 403 for an authenticated non-admin (Requirements 12.4, 12.5)
// ---------------------------------------------------------------------------
// Feature: secure-admin-user-management, Property 24
describe('Authenticated non-admins are rejected with a 403 standard error envelope', () => {
  it('a student token on create yields 403 with { success:false, message }', async () => {
    const resp = await request(app)
      .post('/api/students')
      .set('Authorization', bearer(studentToken))
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@school.edu',
        studentId: 'STU-001',
        grade: '10',
        credentialDeliveryMethod: 'setup_link',
      });

    // HTTP status code is the machine-readable code (403 = insufficient role).
    expect(resp.status).toBe(403);
    expect(resp.body.success).toBe(false);
    expect(typeof resp.body.message).toBe('string');
    expect(resp.body.message.length).toBeGreaterThan(0);
    // Authenticated but unauthorized: the handler must not run.
    expect(studentServiceMock.createWithCredentials).not.toHaveBeenCalled();
  });

  it('a student token on faculty delete yields 403 with the standard envelope', async () => {
    const resp = await request(app)
      .delete('/api/faculty/507f1f77bcf86cd799439022')
      .set('Authorization', bearer(studentToken));

    expect(resp.status).toBe(403);
    expect(resp.body.success).toBe(false);
    expect(typeof resp.body.message).toBe('string');
    expect(facultyServiceMock.deactivate).not.toHaveBeenCalled();
  });
});
