/* ─── Shared types for the Runnix dashboard ─── */

// ── Auth ──
export type UserTier = "free" | "starter" | "professional" | "enterprise";
export type UserRole = "user" | "admin";

export interface User {
  id: string;
  username: string;
  email: string;
  tier: UserTier;
  rateLimit: number;
  created_at: number;
  role?: UserRole;
}

// ── Code Execution ──
export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "ACCEPTED"
  | "RUNTIME_ERROR"
  | "COMPILE_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "SYSTEM_ERROR";

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

// ── API Keys ──
export interface ApiKey {
  keyId: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number | null;
}

// ── Webhooks ──
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  createdAt: number;
  active: boolean;
}

export interface WebhookDelivery {
  id: string;
  status: "success" | "failed";
  statusCode: number;
  timestamp: number;
  error?: string;
}

// ── Admin ──
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  tier: UserTier;
  role: UserRole;
  rateLimit: number;
  createdAt: number;
}

export interface StatusData {
  jobs?: {
    submitted: number;
    completed: number;
    success_rate: string;
    jobs_per_second: string;
  };
  execution?: {
    average_ms: number;
    p95_ms: number;
  };
  queue?: {
    current_size: number;
    average_wait_time_ms: number;
  };
  workers?: {
    error_count: number;
  };
  system?: {
    redis_connected: boolean;
    memory_mb: number;
    error_rate: string;
  };
  uptime?: {
    human: string;
  };
}

// ── Rate Limit ──
export interface RateLimit {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}
