import { createContext } from 'react';
import type { User } from '../types';

export interface AuthValue {
  token: string | null;
  user: User | null;
  restoring: boolean;
  sessionMessage: string;
  login: (username: string, password: string) => Promise<void>;
  logout: (message?: string) => void;
  handleError: (error: unknown, session: number) => void;
  session: number;
  isCurrentSession: (session: number) => boolean;
  retryRestore: () => void;
  restoreError: string;
}
export const AuthContext = createContext<AuthValue | null>(null);
