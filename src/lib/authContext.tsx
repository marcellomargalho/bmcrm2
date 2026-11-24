import React, { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const AuthUserContext = createContext<AuthUser | null>(null);

export function useAuthUser(): AuthUser | null {
  return useContext(AuthUserContext);
}
