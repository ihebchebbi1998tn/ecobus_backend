import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'EcoBus V2 API',
    version: '1.0.0',
    description:
      'Smart school-bus tracking platform. Multi-tenant REST API with JWT auth, '
      + 'real-time GPS ingestion, fleet management, child check-ins, SOS alerts and analytics.',
    contact: { name: 'EcoBus Team', email: 'support@ecobus.tn' },
    license: { name: 'Proprietary' },
  },
  servers: [
    { url: `http://localhost:${env.port}${env.apiPrefix}`, description: 'Local dev' },
    { url: `https://api.ecobus.tn${env.apiPrefix}`, description: 'Production' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness and readiness probes' },
    { name: 'Logs', description: 'Backend log viewer (token-protected)' },
    { name: 'Auth', description: 'Registration, login, current user' },
    { name: 'Buses', description: 'Fleet management' },
    { name: 'Routes', description: 'Routes and stops' },
    { name: 'Trips', description: 'Trip lifecycle' },
    { name: 'GPS', description: 'Real-time location ingestion' },
    { name: 'Check-ins', description: 'Student boarding events' },
    { name: 'SOS', description: 'Emergency alerts' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Analytics', description: 'Product analytics events' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      RequestIdHeader: {
        in: 'header',
        name: 'X-Request-Id',
        required: false,
        schema: { type: 'string', maxLength: 128 },
        description:
          'Optional client-supplied correlation id. Echoed back in the '
          + '`X-Request-Id` response header and included in every error '
          + 'response body and server log line for end-to-end tracing.',
      },
    },
    headers: {
      XRequestId: {
        description: 'Correlation id for this request (generated if not provided).',
        schema: { type: 'string' },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Validation failed' },
          issues: { type: 'array', items: { type: 'object' } },
        },
      },
      ReadinessReport: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          totalLatencyMs: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ok', 'down', 'unknown'] },
                  latencyMs: { type: 'integer', nullable: true },
                  error: { type: 'string', nullable: true },
                },
              },
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['ok', 'incomplete', 'error', 'skipped', 'unknown'] },
                  present: { type: 'integer' },
                  required: { type: 'integer' },
                  missing: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
          organization: { $ref: '#/components/schemas/Organization' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['organizationName', 'firstName', 'lastName', 'email', 'password'],
        properties: {
          organizationName: { type: 'string', example: 'Lycée Pilote Tunis' },
          firstName: { type: 'string', example: 'Sami' },
          lastName: { type: 'string', example: 'Ben Ali' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          phone: { type: 'string', nullable: true },
          roles: { type: 'array', items: { type: 'string' } },
        },
      },
      Organization: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
        },
      },
      Bus: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          plate_number: { type: 'string' },
          capacity: { type: 'integer' },
          status: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      BusInput: {
        type: 'object',
        required: ['name', 'plateNumber', 'capacity'],
        properties: {
          name: { type: 'string' },
          plateNumber: { type: 'string' },
          capacity: { type: 'integer', minimum: 1, maximum: 200 },
        },
      },
      LiveStatus: {
        type: 'object',
        properties: {
          bus_id: { type: 'string', format: 'uuid' },
          trip_id: { type: 'string', format: 'uuid', nullable: true },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          speed: { type: 'number', nullable: true },
          heading: { type: 'number', nullable: true },
          battery_level: { type: 'integer', nullable: true },
          gps_status: { type: 'string' },
          last_update: { type: 'string', format: 'date-time' },
        },
      },
      Route: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      RouteInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
      Stop: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          stop_order: { type: 'integer' },
          planned_time: { type: 'string', nullable: true },
        },
      },
      StopInput: {
        type: 'object',
        required: ['name', 'latitude', 'longitude', 'stopOrder'],
        properties: {
          name: { type: 'string' },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          stopOrder: { type: 'integer', minimum: 0 },
          plannedTime: { type: 'string', example: '07:30:00' },
        },
      },
      Trip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          route_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', example: 'in_progress' },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      TripInput: {
        type: 'object',
        required: ['routeId'],
        properties: {
          routeId: { type: 'string', format: 'uuid' },
          assignmentId: { type: 'string', format: 'uuid' },
        },
      },
      GpsInput: {
        type: 'object',
        required: ['busId', 'latitude', 'longitude'],
        properties: {
          busId: { type: 'string', format: 'uuid' },
          tripId: { type: 'string', format: 'uuid' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          speed: { type: 'number' },
          heading: { type: 'number' },
          accuracy: { type: 'number' },
          batteryLevel: { type: 'integer', minimum: 0, maximum: 100 },
        },
      },
      Checkin: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          trip_id: { type: 'string', format: 'uuid' },
          child_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['boarded', 'left', 'absent'] },
          method: { type: 'string', enum: ['manual', 'qr', 'nfc'] },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      CheckinInput: {
        type: 'object',
        required: ['tripId', 'childId', 'status'],
        properties: {
          tripId: { type: 'string', format: 'uuid' },
          childId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['boarded', 'left', 'absent'] },
          method: { type: 'string', enum: ['manual', 'qr', 'nfc'] },
        },
      },
      SosAlert: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          trip_id: { type: 'string', format: 'uuid', nullable: true },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          status: { type: 'string', example: 'active' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SosInput: {
        type: 'object',
        properties: {
          tripId: { type: 'string', format: 'uuid' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          is_read: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      AnalyticsEventInput: {
        type: 'object',
        required: ['eventType'],
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
          eventType: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: ['./src/routes/*.js'],
});
