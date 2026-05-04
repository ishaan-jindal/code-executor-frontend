import { useCallback, useState } from "react";
import { AxiosResponse } from "axios";
import type { RateLimit } from "./types";

export type { RateLimit };

export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState<RateLimit>({
    limit: null,
    remaining: null,
    reset: null,
  });

  const capture = useCallback((response: AxiosResponse) => {
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
  }, []);

  return { rateLimit, capture };
}
