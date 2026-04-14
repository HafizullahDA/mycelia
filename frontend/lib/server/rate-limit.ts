type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitPolicy = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

const getStore = (): RateLimitStore => {
  const globalStore = globalThis as typeof globalThis & {
    __myceliaRateLimitStore?: RateLimitStore;
  };

  if (!globalStore.__myceliaRateLimitStore) {
    globalStore.__myceliaRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalStore.__myceliaRateLimitStore;
};

const cleanupExpiredEntries = (store: RateLimitStore, now: number) => {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
};

export const getClientAddress = (request: Request): string => {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
};

export const applyRateLimit = (policy: RateLimitPolicy): RateLimitResult => {
  const now = Date.now();
  const store = getStore();

  cleanupExpiredEntries(store, now);

  const current = store.get(policy.key);

  if (!current || current.resetAt <= now) {
    store.set(policy.key, {
      count: 1,
      resetAt: now + policy.windowMs,
    });

    return {
      allowed: true,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - 1),
      retryAfterSeconds: 0,
      resetAt: now + policy.windowMs,
    };
  }

  if (current.count >= policy.limit) {
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(policy.key, current);

  return {
    allowed: true,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - current.count),
    retryAfterSeconds: 0,
    resetAt: current.resetAt,
  };
};
