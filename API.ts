API.ts
import { apiRequest } from "./queryClient";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  streakCount: number;
}

export interface Session {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  active: boolean;
  createdAt: string;
}

export const authApi = {
  signup: async (data: { name: string; email: string; password: string; role?: string }) => {
    const response = await apiRequest("POST", "/api/auth/signup", data);
    return response.json();
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiRequest("POST", "/api/auth/login", data);
    return response.json();
  },

  logout: async () => {
    const response = await apiRequest("POST", "/api/auth/logout");
    return response.json();
  },

  me: async () => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },
};

export const sessionApi = {
  create: async (code: string) => {
    const response = await apiRequest("POST", "/api/sessions", { code });
    return response.json();
  },

  join: async (code: string) => {
    const response = await apiRequest("POST", "/api/sessions/join", { code });
    return response.json();
  },

  get: async (id: string) => {
    const response = await apiRequest("GET", `/api/sessions/${id}`);
    return response.json();
  },
};