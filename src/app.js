import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/requestLogger.js';
import { swaggerSpec } from './config/swagger.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Correlation id must run before anything that logs or may error.
  app.use(requestId);

  app.use(helmet({ contentSecurityPolicy: false })); // allow swagger-ui assets
  app.use(cors({
    origin: env.corsOrigin.length === 1 && env.corsOrigin[0] === '*' ? true : env.corsOrigin,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);
  app.use(apiLimiter);

  // OpenAPI / Swagger
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'EcoBus V2 API Docs',
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  app.use(env.apiPrefix, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
