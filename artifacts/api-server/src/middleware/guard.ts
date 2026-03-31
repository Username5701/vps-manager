import type { Request, Response, NextFunction } from "express";

// ── Bot / automated-client User-Agent patterns ─────────────────────────────
const BOT_UA = [
  /^curl\//i, /^wget\//i, /^python-requests/i, /^python-urllib/i,
  /^Go-http-client/i, /^Java\//i, /^okhttp\//i, /^HTTPie\//i,
  /^axios\//i, /^node-fetch/i, /^node-superagent/i, /^got\//i,
  /^PostmanRuntime/i, /^insomnia\//i, /^Paw\//i, /^RapidAPI/i,
  /^libwww-perl/i, /^Scrapy/i, /^php-curl/i, /^Ruby/i,
  /Googlebot/i, /Bingbot/i, /Slurp/i, /DuckDuckBot/i,
  /bot[^t]/i, /spider/i, /crawl/i, /scan/i, /shodan/i,
];

// ── Custom client header the browser always sends ─────────────────────────
// Stored in the JS bundle — keeps out casual curl users who don't read source
const XCM_CLIENT_TOKEN = "xcm-browser-v1";

// ── In-memory rate limiter + IP ban list ───────────────────────────────────
interface RateEntry { count: number; resetAt: number }

const rateMap   = new Map<string, RateEntry>();
const bannedIps = new Set<string>();

const RATE_LIMIT  = 120;          // requests allowed per window
const RATE_WINDOW = 60_000;       // 1 minute in ms
const BAN_STRIKES = 10;           // ban after this many refused requests

// Per-IP refusal counter (auto-bans persistent hammering)
const strikeMap = new Map<string, number>();

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "0.0.0.0"
  );
}

function addStrike(ip: string): void {
  const n = (strikeMap.get(ip) ?? 0) + 1;
  strikeMap.set(ip, n);
  if (n >= BAN_STRIKES) bannedIps.add(ip);
}

function ratePassed(ip: string): boolean {
  const now  = Date.now();
  const slot = rateMap.get(ip);
  if (!slot || now > slot.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  slot.count++;
  return slot.count <= RATE_LIMIT;
}

// Tidy up expired rate entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, slot] of rateMap) {
    if (now > slot.resetAt) rateMap.delete(ip);
  }
}, 600_000);

// ── Honeypot trap ──────────────────────────────────────────────────────────
export function honeypotTrap(_req: Request, res: Response): void {
  const ip = getIp(_req);
  bannedIps.add(ip);          // permanently ban whoever probes these routes
  strikeMap.set(ip, BAN_STRIKES);
  res.status(404).end();
}

// ── Main guard middleware ──────────────────────────────────────────────────
export function botGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);

  // 1. Permanently banned IP
  if (bannedIps.has(ip)) {
    res.status(403).end();
    return;
  }

  // 2. Rate limit
  if (!ratePassed(ip)) {
    bannedIps.add(ip);    // auto-ban rate abusers
    res.status(429).set("Retry-After", "60").end();
    return;
  }

  // 3. User-Agent block — missing UA or known bot/tool UA
  const ua = req.headers["user-agent"] ?? "";
  if (!ua || BOT_UA.some((p) => p.test(ua))) {
    addStrike(ip);
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // 4. Custom client header — every request from the browser app carries this.
  //    Skip only for the /health ping (used by uptime monitors which are exempt).
  const isHealth = req.path === "/health";
  if (!isHealth) {
    const clientToken = req.headers["x-xcm-client"];
    if (clientToken !== XCM_CLIENT_TOKEN) {
      addStrike(ip);
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  next();
}
