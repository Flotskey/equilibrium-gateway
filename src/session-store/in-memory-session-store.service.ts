import { SessionStore } from './session-store.interface';

type SessionValue<T> = {
  data: T;
  expiresAt: Date;
  timeoutHandle: NodeJS.Timeout;
};

export class InMemorySessionStore<T> implements SessionStore<T> {
  private store = new Map<string, SessionValue<T>>();
  private readonly sessionTtlMs: number;

  constructor(sessionTtlMinutes: number = 240) {
    // 240 minutes
    this.sessionTtlMs = sessionTtlMinutes * 60 * 1000;
  }

  async set(key: string, value: T): Promise<void> {
    this.removeTimeout(key);
    let timeoutHandle: NodeJS.Timeout | null = null;
    let expiresAt: Date | null = null;
    if (isFinite(this.sessionTtlMs)) {
      timeoutHandle = setTimeout(() => this.delete(key), this.sessionTtlMs);
      expiresAt = new Date(Date.now() + this.sessionTtlMs);
    }
    this.store.set(key, { data: value, expiresAt, timeoutHandle });
  }

  async get(key: string): Promise<T | undefined> {
    const session = this.store.get(key);
    if (!session) return undefined;
    // Refresh session TTL only if not infinite
    if (isFinite(this.sessionTtlMs) && session.data) {
      await this.set(key, session.data);
    }
    return session.data;
  }

  async delete(key: string): Promise<void> {
    this.removeTimeout(key);
    this.store.delete(key);
  }

  private removeTimeout(key: string) {
    const session = this.store.get(key);
    if (session?.timeoutHandle) clearTimeout(session.timeoutHandle);
  }
}
