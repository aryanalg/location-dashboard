import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

interface IRateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
}

class InMemoryRateLimiter implements IRateLimiter {
  private cache: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxRequests: number = 30, windowMs: number = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up expired entries every minute
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    if ("unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.cache.get(identifier);

    // No existing entry or expired window
    if (!entry || now > entry.resetTime) {
      this.cache.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetIn: this.windowMs,
      };
    }

    // Within window, check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now,
    };
  }
}

class UpstashRateLimiter implements IRateLimiter {
  private readonly ratelimit: Ratelimit;

  constructor(prefix: string, maxRequests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
    const redis = getSharedRedisClient();
    this.ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      prefix: `location-dashboard:${prefix}`,
    });
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const result = await this.ratelimit.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetIn: Math.max(0, result.reset - Date.now()),
    };
  }
}

type SharedRateLimitGlobals = {
  __locationDashboardRedis?: Redis;
};

const globalState = globalThis as typeof globalThis & SharedRateLimitGlobals;

function hasUpstashCredentials(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getSharedRedisClient(): Redis {
  if (!hasUpstashCredentials()) {
    throw new Error("Upstash Redis credentials are missing.");
  }
  if (!globalState.__locationDashboardRedis) {
    globalState.__locationDashboardRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return globalState.__locationDashboardRedis;
}

function createRateLimiter(
  prefix: string,
  maxRequests: number,
  windowMs: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`
): IRateLimiter {
  if (hasUpstashCredentials()) {
    return new UpstashRateLimiter(prefix, maxRequests, window);
  }
  return new InMemoryRateLimiter(maxRequests, windowMs);
}

// API endpoints: 30 requests per minute per user
export const apiRateLimiter = createRateLimiter("api", 30, 60 * 1000, "1 m");

// Auth endpoints: 10 requests per minute per IP
export const authRateLimiter = createRateLimiter("auth", 10, 60 * 1000, "1 m");
