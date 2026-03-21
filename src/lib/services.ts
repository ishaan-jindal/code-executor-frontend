import api from "./api";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "ACCEPTED"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "COMPILE_ERROR";

export type Language = "python" | "c";

export interface JobResult {
  stdin: string;
  status: JobStatus;
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface JobMetrics {
  queue_wait_ms: number;
  compile_time_ms: number;
  exec_time_ms: number;
  total_time_ms: number;
}

export interface Job {
  id?: string;
  job_id?: string;
  userId: string;
  language: Language;
  status: JobStatus;
  code?: string;
  stdin?: string;
  inputs?: string[];
  metrics?: JobMetrics;
  results?: JobResult[];
  created_at: number;
}

export interface SubmitResponse {
  job_id: string;
  status: JobStatus;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
  filters: {
    status: string | null;
    language: string | null;
    from: string | null;
    to: string | null;
  };
}

export const authService = {
  register: (username: string, email: string, password: string) =>
    api.post("/auth/register", { username, email, password }),

  login: (credentials: {
    username?: string;
    email?: string;
    password: string;
  }) => api.post("/auth/login", credentials),

  me: () => api.get("/auth/me"),

  logoutAll: () => api.post("/auth/logout-all"),

  generateApiKey: (name: string) =>
    api.post("/auth/api-keys", { name }),

  listApiKeys: () => api.get("/auth/api-keys"),

  revokeApiKey: (keyId: string) =>
    api.delete(`/auth/api-keys/${keyId}`),
};

export const executionService = {
  submit: (language: Language, code: string, stdin?: string) =>
    api.post<{ success: boolean; data: SubmitResponse }>("/submit", {
      language,
      code,
      ...(stdin ? { stdin } : {}),
    }),

  getResult: (jobId: string) =>
    api.get<{ success: boolean; data: Job }>(`/result/${jobId}`),

  getJobCode: (jobId: string) =>
    api.get(`/jobs/${jobId}/code`),

  listJobs: (params?: {
    status?: JobStatus;
    language?: Language;
    limit?: number;
    offset?: number;
  }) =>
    api.get<{ success: boolean; data: JobsResponse }>("/jobs", { params }),
};

export const webhookService = {
  create: (url: string, events: string[], secret?: string) =>
    api.post("/webhooks", { url, events, ...(secret ? { secret } : {}) }),

  list: () => api.get("/webhooks"),

  get: (id: string) => api.get(`/webhooks/${id}`),

  getDeliveries: (id: string) => api.get(`/webhooks/${id}/deliveries`),

  delete: (id: string) => api.delete(`/webhooks/${id}`),
};

export const adminService = {
  listUsers: (page = 0, limit = 20) =>
    api.get("/admin/users", { params: { limit, offset: page * limit } }),

  getUser: (userId: string) =>
    api.get(`/admin/users/${userId}`),

  upgradeUser: (userId: string, newTier: string) =>
    api.post(`/admin/users/${userId}/upgrade`, { newTier }),

  makeAdmin: (userId: string) =>
    api.post(`/admin/users/${userId}/make-admin`),

  revokeAdmin: (userId: string) =>
    api.post(`/admin/users/${userId}/revoke-admin`),
};

export const publicService = {
  languages: () => api.get("/languages"),
  language: (lang: string) => api.get(`/languages/${lang}`),
  health: () => api.get("/health"),
  status: () => api.get("/status"),
};