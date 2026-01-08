/**
 * SustainPro Shared Swagger Configuration
 * 
 * Provides reusable Swagger/OpenAPI setup for all microservices
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export interface SwaggerConfig {
  serviceName: string;
  serviceDescription: string;
  version: string;
  port: number;
  apiPrefix?: string;
  tags?: Array<{ name: string; description: string }>;
}

/**
 * Base Swagger definition shared across all services
 */
const baseSwaggerDefinition = {
  openapi: '3.0.0',
  servers: [
    {
      url: 'http://localhost:8080/api/v1',
      description: 'Development (via nginx)',
    },
    {
      url: 'https://api.sustainpro.com/api/v1',
      description: 'Production',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /auth/login',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'JWT refresh token (httpOnly cookie)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                message: 'Unauthorized',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
      },
      ForbiddenError: {
        description: 'User does not have required permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                message: 'Forbidden',
                code: 'FORBIDDEN',
              },
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                message: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                  email: 'Invalid email format',
                },
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Generate Swagger specification for a microservice
 */
export function generateSwaggerSpec(config: SwaggerConfig) {
  const options: swaggerJsdoc.Options = {
    definition: {
      ...baseSwaggerDefinition,
      info: {
        title: config.serviceName,
        version: config.version,
        description: config.serviceDescription,
        contact: {
          name: 'SustainPro Support',
          email: 'support@sustainpro.com',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.port}${config.apiPrefix || ''}`,
          description: 'Direct service access (development)',
        },
        ...baseSwaggerDefinition.servers,
      ],
      tags: config.tags || [],
    },
    // Look for JSDoc comments in route files
    apis: ['./src/routes/*.ts', './src/routes/**/*.ts', './dist/routes/*.js', './dist/routes/**/*.js'],
  };

  return swaggerJsdoc(options);
}

/**
 * Setup Swagger UI middleware for Express app
 */
export function setupSwagger(app: Express, config: SwaggerConfig): void {
  const swaggerSpec = generateSwaggerSpec(config);
  const apiPrefix = config.apiPrefix || '';

  // Serve Swagger JSON
  app.get(`${apiPrefix}/swagger.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use(
    `${apiPrefix}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: config.serviceName,
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  console.log(`📚 Swagger UI available at: http://localhost:${config.port}${apiPrefix}/docs`);
  console.log(`📄 Swagger JSON available at: http://localhost:${config.port}${apiPrefix}/swagger.json`);
}

/**
 * Common Swagger JSDoc annotations for reuse
 */
export const swaggerAnnotations = {
  bearerAuth: `
   * @security BearerAuth
  `,
  pagination: `
   * @param {integer} page.query - Page number (default: 1)
   * @param {integer} limit.query - Items per page (default: 20, max: 100)
  `,
  commonErrors: `
   * @returns {401} Unauthorized - Invalid or missing token
   * @returns {403} Forbidden - Insufficient permissions
   * @returns {500} Internal Server Error
  `,
};

// Export types
export { swaggerJsdoc, swaggerUi };
