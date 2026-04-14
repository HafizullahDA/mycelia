type BrowserActionPolicy = {
  action: string;
  limit: number;
  windowMs: number;
};

type BrowserActionResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buildStorageKey = (action: string) => `mycelia:action-throttle:${action}`;

const readAttempts = (action: string, now: number, windowMs: number): number[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(buildStorageKey(action));

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is number => typeof value === 'number' && now - value < windowMs);
  } catch {
    return [];
  }
};

const writeAttempts = (action: string, attempts: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(buildStorageKey(action), JSON.stringify(attempts));
  } catch {
    // Ignore storage failures and allow the auth flow to continue.
  }
};

export const consumeBrowserAction = (policy: BrowserActionPolicy): BrowserActionResult => {
  const now = Date.now();
  const attempts = readAttempts(policy.action, now, policy.windowMs);

  if (attempts.length >= policy.limit) {
    const oldestAttempt = attempts[0];

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldestAttempt + policy.windowMs - now) / 1000)),
    };
  }

  writeAttempts(policy.action, [...attempts, now]);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
};

export const resetBrowserAction = (action: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(buildStorageKey(action));
  } catch {
    // Ignore storage failures.
  }
};
