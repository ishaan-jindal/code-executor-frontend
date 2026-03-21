import { useState } from "react";
import { AxiosResponse } from "axios";

export interface RateLimit {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}

export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState<RateLimit>({
    limit: null,
    remaining: null,
    reset: null,
  });

  const capture = (response: AxiosResponse) => {
    const limit = response.headers["x-ratelimit-limit"];
    const remaining = response.headers["x-ratelimit-remaining"];
    const reset = response.headers["x-ratelimit-reset"];
    if (limit) {
      setRateLimit({
        limit: Number(limit),
        remaining: Number(remaining),
        reset: Number(reset),
      });
    }
    return response;
  };

  return { rateLimit, capture };
}
