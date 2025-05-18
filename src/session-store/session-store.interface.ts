export interface SessionStore<T = any> {
  set(sessionId: string, value: T): Promise<void>;
  get(sessionId: string): Promise<T | undefined>;
  delete(sessionId: string): Promise<void>;
}
