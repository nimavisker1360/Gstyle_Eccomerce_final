import { Redis } from "@upstash/redis";

type GlobalWithRedis = typeof globalThis & {
  __upstashRedis?: Redis;
};

const g = global as GlobalWithRedis;

export const redis: Redis =
  g.__upstashRedis ||
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

if (!g.__upstashRedis) {
  g.__upstashRedis = redis;
}

export function getRedisKeyForQuery(query: string) {
  return `search:v1:${query.toLowerCase().trim()}`;
}

export const ONE_DAY_SECONDS = 24 * 60 * 60;
