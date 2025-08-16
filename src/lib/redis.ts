import IORedis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

type GlobalWithRedis = typeof globalThis & {
  __redisCompat?: RedisCompat;
};

const g = global as GlobalWithRedis;

type RedisCompat = {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, ttlSeconds: number, value: string) => Promise<any>;
  keys: (pattern: string) => Promise<string[]>;
  del: (...keys: string[]) => Promise<any>;
  flushdb: () => Promise<any>;
  dbsize: () => Promise<number>;
};

// Create a Redis client that prefers ioredis (REDIS_URL) and falls back to Upstash
const createCompatClient = (): RedisCompat => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const client = new IORedis(redisUrl, {
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    return {
      get: (key) => client.get(key),
      setex: (key, ttl, value) => client.setex(key, ttl, value),
      keys: (pattern) => client.keys(pattern),
      del: (...keys) => client.del(...keys),
      flushdb: () => client.flushdb(),
      dbsize: () => client.dbsize(),
    };
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    const upstash = new UpstashRedis({ url: upstashUrl, token: upstashToken });
    return {
      get: async (key) => (await upstash.get<string | null>(key)) as any,
      setex: async (key, ttl, value) => upstash.set(key, value, { ex: ttl }),
      keys: async (pattern) => (await upstash.keys(pattern)) as any,
      del: async (...keys) => upstash.del(...(keys as any)),
      flushdb: async () => upstash.flushdb(),
      dbsize: async () => (await upstash.dbsize()) as any,
    };
  }

  // Fallback to in-memory shim to avoid build-time failures
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  const now = () => Date.now();
  const isExpired = (expiresAt: number | null) =>
    expiresAt !== null && now() > expiresAt;
  const cleanupIfExpired = (key: string) => {
    const entry = store.get(key);
    if (!entry) return;
    if (isExpired(entry.expiresAt)) {
      store.delete(key);
    }
  };
  const patternToRegex = (pattern: string) =>
    new RegExp(
      "^" +
        pattern.replace(/[.+^${}()|\[\]\\]/g, "\\$&").replace(/\*/g, ".*") +
        "$"
    );
  console.warn(
    "REDIS_URL and Upstash credentials not set. Using in-memory Redis shim (non-persistent)."
  );
  return {
    get: async (key) => {
      cleanupIfExpired(key);
      const entry = store.get(key);
      return entry ? entry.value : null;
    },
    setex: async (key, ttl, value) => {
      const expiresAt = now() + ttl * 1000;
      store.set(key, { value, expiresAt });
      return "OK" as any;
    },
    keys: async (pattern) => {
      const regex = patternToRegex(pattern);
      const keys: string[] = [];
      const allKeys = Array.from(store.keys());
      for (let i = 0; i < allKeys.length; i++) {
        const key = allKeys[i];
        cleanupIfExpired(key);
        if (regex.test(key)) keys.push(key);
      }
      return keys;
    },
    del: async (...keys) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
      }
      return count as any;
    },
    flushdb: async () => {
      store.clear();
      return "OK" as any;
    },
    dbsize: async () => {
      let count = 0;
      const allKeys = Array.from(store.keys());
      for (let i = 0; i < allKeys.length; i++) {
        const key = allKeys[i];
        cleanupIfExpired(key);
        if (store.has(key)) count++;
      }
      return count as any;
    },
  };
};

export const redis: RedisCompat = g.__redisCompat || createCompatClient();

if (!g.__redisCompat) {
  g.__redisCompat = redis;
}

export function getRedisKeyForQuery(query: string) {
  return `search:v1:${query.toLowerCase().trim()}`;
}

export const ONE_DAY_SECONDS = 24 * 60 * 60;
