import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? new Set(process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')))
  : null;

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  credentials: true,
  origin: (origin, cb) => {
    if (!origin) return cb(null, !isProduction);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (!allowedOrigins) {
      return cb(isProduction ? new Error('CORS: no allowlist configured') : null, !isProduction);
    }
    if (allowedOrigins.has(normalizedOrigin)) {
      return cb(null, true);
    }
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
