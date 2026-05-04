interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

function asApiError(error: unknown): ApiErrorShape | null {
  if (typeof error !== "object" || error === null) return null;
  return error as ApiErrorShape;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = asApiError(error);
  return apiError?.response?.data?.error ?? fallback;
}

export function getApiStatus(error: unknown): number | undefined {
  const apiError = asApiError(error);
  return apiError?.response?.status;
}