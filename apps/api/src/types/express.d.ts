import type { User } from '../domain.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        user: User;
        sessionId: string;
      };
    }
  }
}

export {};
