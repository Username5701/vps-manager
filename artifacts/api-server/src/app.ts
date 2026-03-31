import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { botGuard, honeypotTrap } from "./middleware/guard";

const app: Express = express();

// Trust the Nginx reverse-proxy so req.ip resolves to the real client IP
// (read from X-Forwarded-For) instead of 127.0.0.1.
app.set("trust proxy", 1);

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Global bot / curl guard ────────────────────────────────────────────────
app.use(botGuard);

// ── Honeypot routes — bans any IP that probes these paths ─────────────────
const HONEYPOT_PATHS = [
  "/api/env", "/api/config", "/api/admin", "/api/debug",
  "/api/setup", "/api/secret", "/api/keys", "/api/credentials",
  "/.env", "/config.json", "/api/v1", "/api/v2",
  "/wp-admin", "/wp-login.php", "/phpmyadmin", "/admin",
  "/.git/config", "/server-status", "/actuator", "/actuator/env",
];
for (const path of HONEYPOT_PATHS) {
  app.all(path, honeypotTrap);
}

app.use("/api", router);

export default app;
