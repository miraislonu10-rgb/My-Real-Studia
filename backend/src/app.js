/**
 * STUDIA - Aplicacion Express
 * ------------------------------------------------------------------
 * Configura middlewares globales, seguridad, CORS, limite de peticiones
 * y monta el enrutador principal bajo el prefijo /api.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import routes from './routes/index.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

// No revelar la tecnologia del servidor en las cabeceras HTTP
app.disable('x-powered-by');

// Detras de un proxy (Render, Railway, Vercel) la IP real llega en X-Forwarded-For.
// Sin esto el limitador de peticiones contaria a todos los usuarios como uno solo.
if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

// Cabeceras de seguridad HTTP
app.use(helmet());

// Permitir peticiones del cliente React (CORS)
app.use(
  cors({
    origin: env.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Parseo de cuerpo de peticiones
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Log de peticiones HTTP
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Limite basico de peticiones por IP (mitiga fuerza bruta y abuso)
app.use(
  env.apiPrefix,
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas peticiones. Intenta de nuevo mas tarde.',
      data: null,
    },
  })
);

// Rutas de la API
app.use(env.apiPrefix, routes);

// Raiz informativa
app.get('/', (req, res) => {
  res.json({
    success: true,
    error: null,
    message: 'STUDIA API en linea. Consulta la documentacion en /api',
    data: { documentation: `${env.apiPrefix}` },
  });
});

// 404 y manejo centralizado de errores (siempre al final)
app.use(notFound);
app.use(errorHandler);

export default app;
