/**
 * Dynamic Waiting-Time & Queuing Engine (M/M/c)
 * Implementation of EWMA throughput and multi-server queue wait estimates.
 */

export const DEFAULT_ALPHA = 0.25;
export const DEFAULT_SERVICE_DURATION_SEC = 120; // 2 minutes baseline
export const DEFAULT_MU = 1 / DEFAULT_SERVICE_DURATION_SEC; // ~0.00833 tokens/sec

/**
 * Calculates updated EWMA throughput rate for a counter.
 * mu_t = alpha * mu_recent + (1 - alpha) * mu_{t-1}
 *
 * @param currentMu - Previous EWMA throughput rate (tokens/sec). Default is 1/120
 * @param recentDurationSec - Actual duration of the completed transaction in seconds
 * @param alpha - Smoothing factor (default 0.25)
 * @returns Updated throughput rate mu_t (tokens/sec)
 */
export function calculateEWMA(
  currentMu: number = DEFAULT_MU,
  recentDurationSec: number,
  alpha: number = DEFAULT_ALPHA
): number {
  if (recentDurationSec <= 0) {
    return currentMu;
  }
  // Clamp duration to realistic floor (e.g., 5 seconds) to prevent division anomalies
  const sanitizedDuration = Math.max(5, recentDurationSec);
  const muRecent = 1 / sanitizedDuration;
  const updatedMu = alpha * muRecent + (1 - alpha) * currentMu;
  return updatedMu;
}

/**
 * Computes estimated wait time in seconds for a token at position p
 * across active counters with throughput rates activeMus.
 *
 * Estimated Wait = p / (sum_{i=1}^c mu_i)
 *
 * @param position - 1-indexed position in queue (1 = next to be served)
 * @param activeMus - Array of mu values (tokens/sec) for currently OPEN counters
 * @param defaultDurationSec - Fallback duration if no counters are open
 * @returns Estimated wait time in seconds
 */
export function calculateAggregateWaitSec(
  position: number,
  activeMus: number[],
  defaultDurationSec: number = DEFAULT_SERVICE_DURATION_SEC
): {
  estWaitSec: number;
  totalServiceRatePerSec: number;
  activeCounters: number;
  isCountersPaused: boolean;
} {
  if (position <= 0) {
    return {
      estWaitSec: 0,
      totalServiceRatePerSec: 0,
      activeCounters: activeMus.length,
      isCountersPaused: activeMus.length === 0,
    };
  }

  // Filter out any zero or negative mu values
  const validMus = activeMus.filter((mu) => mu > 0);
  const totalServiceRate = validMus.reduce((sum, rate) => sum + rate, 0);

  if (validMus.length === 0 || totalServiceRate <= 0) {
    // If all counters are closed, estimate based on baseline service time
    return {
      estWaitSec: Math.round(position * defaultDurationSec),
      totalServiceRatePerSec: 0,
      activeCounters: 0,
      isCountersPaused: true,
    };
  }

  const estWaitSec = Math.round(position / totalServiceRate);

  return {
    estWaitSec: Math.max(10, estWaitSec),
    totalServiceRatePerSec: totalServiceRate,
    activeCounters: validMus.length,
    isCountersPaused: false,
  };
}

/**
 * Factorial helper with safety limits for Erlang-C
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

/**
 * Calculates Erlang-C waiting probability and theoretical queue wait time.
 * P_W = Probability an arriving customer has to wait in queue.
 *
 * @param c - Number of active servers (c >= 1)
 * @param lambda - Arrival rate (arrivals per second)
 * @param mu - Service rate per server (completions per second)
 */
export function calculateErlangC(
  c: number,
  lambda: number,
  mu: number
): {
  erlangCProbability: number;
  theoreticalWaitSec: number;
  utilization: number;
} {
  if (c <= 0 || mu <= 0 || lambda <= 0) {
    return { erlangCProbability: 0, theoreticalWaitSec: 0, utilization: 0 };
  }

  const r = lambda / mu; // Traffic offered (Erlangs)
  const rho = r / c; // System utilization

  if (rho >= 1) {
    // System is saturated
    return {
      erlangCProbability: 1.0,
      theoreticalWaitSec: 9999,
      utilization: rho,
    };
  }

  // Compute sum_{k=0}^{c-1} (r^k / k!)
  let sumK = 0;
  for (let k = 0; k < c; k++) {
    sumK += Math.pow(r, k) / factorial(k);
  }

  const termC = (Math.pow(r, c) / factorial(c)) * (1 / (1 - rho));
  const erlangCProbability = termC / (sumK + termC);

  // Expected waiting time in queue: W_q = P_W / (c * mu - lambda)
  const theoreticalWaitSec = erlangCProbability / (c * mu - lambda);

  return {
    erlangCProbability: Math.min(1, Math.max(0, erlangCProbability)),
    theoreticalWaitSec: Math.round(theoreticalWaitSec),
    utilization: Number(rho.toFixed(3)),
  };
}

/**
 * Format seconds into a friendly human-readable format.
 */
export function formatWaitTime(seconds: number): string {
  if (seconds <= 0) return 'Immediate';
  if (seconds < 60) return '< 1 min';
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  if (minutes < 5 && remainingSec > 15) {
    return `~${minutes}m ${remainingSec}s`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    return `~${hours}h ${remMins}m`;
  }
  return `~${minutes} min`;
}
