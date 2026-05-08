import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? new Set(process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/$/, '')))
  : null;

const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  credentials: true,
  origin: (origin, cb) => {
    // Same-origin or server-to-server requests (no Origin header)
    if (!origin) return cb(null, !isProduction);

    // Normalize: strip trailing slash
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (!allowedOrigins) {
      // No allowlist configured: open in dev, deny in production
      return cb(isProduction ? new Error('CORS: no allowlist configured') : null, !isProduction);
    }

    // Exact match only — no startsWith to prevent subdomain spoofing
    if (allowedOrigins.has(normalizedOrigin)) {
      return cb(null, true);
    }

    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
