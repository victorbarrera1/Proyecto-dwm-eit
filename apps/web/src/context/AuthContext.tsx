import { createContext, useContext, type PropsWithChildren } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type { AuthSession } from '../types';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: (values: { email: string; password: string }) => Promise<AuthSession>;
  register: (values: { name: string; email: string; password: string }) => Promise<AuthSession>;
  logout: () => Promise<void>;
  isAuthenticating: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => api.auth.me(signal),
    retry: (count, error) => !(error instanceof ApiError && [401, 403].includes(error.status)) && count < 1,
    staleTime: 60_000
  });

  const loginMutation = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (session) => queryClient.setQueryData(['session'], session)
  });

  const registerMutation = useMutation({
    mutationFn: api.auth.register,
    onSuccess: (session) => queryClient.setQueryData(['session'], session)
  });

  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSettled: () => {
      queryClient.setQueryData(['session'], null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' });
    }
  });

  const unauthenticated = sessionQuery.error instanceof ApiError && [401, 403].includes(sessionQuery.error.status);

  return (
    <AuthContext.Provider
      value={{
        session: unauthenticated ? null : sessionQuery.data || null,
        isLoading: sessionQuery.isPending,
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        isAuthenticating: loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
