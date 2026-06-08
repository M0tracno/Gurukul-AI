import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gurukul AI API',
      version: '1.0.0',
      description: 'Gurukul AI Educational Platform API Documentation',
      contact: {
        name: 'Gurukul AI Team',
      },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        Student: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@school.edu' },
            studentId: { type: 'string', example: 'STU-2024-001' },
            grade: { type: 'string', example: '10' },
            dateOfBirth: { type: 'string', format: 'date-time' },
            parentName: { type: 'string', example: 'Jane Doe' },
            parentEmail: { type: 'string', format: 'email' },
            parentPhone: { type: 'string', example: '+1234567890' },
            address: { type: 'string' },
            active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Course: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            title: { type: 'string', example: 'Mathematics 101' },
            code: { type: 'string', example: 'MATH-101' },
            description: { type: 'string', example: 'Introduction to algebra and calculus' },
            faculty: { type: 'string', example: '507f1f77bcf86cd799439013' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            credits: { type: 'number', example: 3 },
            maxStudents: { type: 'integer', example: 30 },
            active: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'Auth endpoints for login, register, and token management' },
      { name: 'Students', description: 'Student management operations' },
      { name: 'Courses', description: 'Course management operations' },
      { name: 'Faculty', description: 'Faculty management operations' },
      { name: 'Enrollment', description: 'Student enrollment operations' },
      { name: 'Attendance', description: 'Attendance tracking operations' },
      { name: 'Marks', description: 'Mark/grade management operations' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };

/**
 * Mount Swagger UI documentation at /api/v1/docs
 */
export function mountSwaggerDocs(app: Express): void {
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gurukul AI API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));

  // Also expose raw JSON spec at /api/v1/docs.json
  app.get('/api/v1/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
