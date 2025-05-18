import { Injectable } from '@nestjs/common';
import { SessionStore } from './session-store.interface';

@Injectable()
export class InMemorySessionStore<T = any> implements SessionStore<T> {
  private store = new Map<string, T>();

  async set(sessionId: string, value: T): Promise<void> {
    this.store.set(sessionId, value);
  }

  async get(sessionId: string): Promise<T | undefined> {
    return this.store.get(sessionId);
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }
}
