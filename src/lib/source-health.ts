'use client';

type HealthEntry = {
  ok: number;
  fail: number;
  ema: number; // 0..1, higher is better
  last_ok?: number;
  last_fail?: number;
};

type HealthStore = {
  v: 1;
  updated_at: number;
  by_host: Record<string, HealthEntry>;
};

const STORAGE_KEY = 'v0tv_source_health_v1';
const UPDATE_EVENT = 'sourceHealthUpdated';

function nowMs(): number {
  return Date.now();
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

export function getHostFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) return null;
    return normalizeHost(parsed.hostname);
  } catch {
    return null;
  }
}

function readStore(): HealthStore {
  if (typeof window === 'undefined') {
    return { v: 1, updated_at: 0, by_host: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: 1, updated_at: 0, by_host: {} };
    const parsed = JSON.parse(raw) as Partial<HealthStore>;
    if (parsed.v !== 1 || !parsed.by_host) {
      return { v: 1, updated_at: 0, by_host: {} };
    }
    return {
      v: 1,
      updated_at: typeof parsed.updated_at === 'number' ? parsed.updated_at : 0,
      by_host: parsed.by_host ?? {},
    };
  } catch {
    return { v: 1, updated_at: 0, by_host: {} };
  }
}

function writeStore(store: HealthStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota issues
  }
}

function emitUpdated(host: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(UPDATE_EVENT, {
      detail: { host, ts: nowMs() },
    }),
  );
}

export function subscribeSourceHealthUpdated(
  onUpdate: (host: string) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent).detail as { host?: string } | undefined;
    if (detail?.host) onUpdate(detail.host);
  };
  window.addEventListener(UPDATE_EVENT, handler as EventListener);
  return () => window.removeEventListener(UPDATE_EVENT, handler as EventListener);
}

export function recordUrlHealth(
  url: string,
  ok: boolean,
  opts?: { weight?: number },
): void {
  const host = getHostFromUrl(url);
  if (!host) return;
  recordHostHealth(host, ok, opts);
}

export function recordHostHealth(
  host: string,
  ok: boolean,
  opts?: { weight?: number },
): void {
  if (typeof window === 'undefined') return;

  const weight = clamp01(typeof opts?.weight === 'number' ? opts.weight : 1);
  const store = readStore();
  const key = normalizeHost(host);

  const existing: HealthEntry = store.by_host[key] ?? {
    ok: 0,
    fail: 0,
    ema: 0.6, // default: slightly optimistic for unknown hosts
  };

  // EMA update: new = old*(1-a) + sample*a
  // sample: ok=1, fail=0. weight acts as alpha multiplier.
  const alpha = 0.25 * weight;
  const sample = ok ? 1 : 0;
  const nextEma = clamp01(existing.ema * (1 - alpha) + sample * alpha);

  const next: HealthEntry = {
    ok: existing.ok + (ok ? 1 : 0),
    fail: existing.fail + (ok ? 0 : 1),
    ema: nextEma,
    last_ok: ok ? nowMs() : existing.last_ok,
    last_fail: ok ? existing.last_fail : nowMs(),
  };

  store.by_host[key] = next;
  store.updated_at = nowMs();
  writeStore(store);
  emitUpdated(key);
}

export function getHostScore(host: string): number {
  const store = readStore();
  const entry = store.by_host[normalizeHost(host)];
  return typeof entry?.ema === 'number' ? clamp01(entry.ema) : 0.6;
}

export function isHostLikelyDown(host: string): boolean {
  const store = readStore();
  const entry = store.by_host[normalizeHost(host)];
  if (!entry) return false;

  // “短期连续失败 + 无后续成功” 认为大概率不可用
  const recentFailMs = 6 * 60 * 60 * 1000; // 6h
  const enoughFails = entry.fail >= 3;
  const recentFail =
    typeof entry.last_fail === 'number' && nowMs() - entry.last_fail < recentFailMs;
  const noRecovery =
    !entry.last_ok ||
    (typeof entry.last_fail === 'number' && entry.last_ok < entry.last_fail);

  return Boolean(enoughFails && recentFail && noRecovery && entry.ema < 0.25);
}
