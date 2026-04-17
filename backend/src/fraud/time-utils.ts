/**
 * time-utils.ts: Distributed Clock Synchronization
 * 
 * Provides deterministic time bucket keys to eliminate Cross-Service Clock Drift
 * in claim fingerprinting and rate-limiting logic.
 */

/**
 * Generates a deterministic time bucket key (30-min window).
 * Primary formula: Math.floor(Date.now() / 1000 / 1800)
 * 
 * @param now Optional timestamp in milliseconds (defaults to Date.now())
 * @returns An integer representing the current 30-minute epoch bucket
 */
export function getTimeBucket(now: number = Date.now()): number {
  // 1800 seconds = 30 minutes
  return Math.floor(now / 1000 / 1800);
}
