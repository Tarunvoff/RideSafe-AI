import { createHash } from 'crypto';

// Simple LCG deterministic RNG to keep dynamic data stable while still varied
export class DeterministicRandom {
  private state: number;

  constructor(anchor: number) {
    this.state = anchor % 2147483647;
    if (this.state <= 0) {
      this.state += 2147483646;
    }
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state;
  }

  nextFloat(): number {
    return (this.next() - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    if (max <= min) {
      return min;
    }
    const range = max - min + 1;
    return Math.floor(this.nextFloat() * range) + min;
  }

  pick<T>(items: T[]): T {
    if (!items.length) {
      throw new Error('Cannot pick from empty array');
    }
    const index = this.nextInt(0, items.length - 1);
    return items[index];
  }
}

export const createAnchorFromString = (input: string): number => {
  const hash = createHash('sha256').update(input).digest();
  // Use first 6 bytes to keep anchor within 32-bit range without collisions
  const anchor = hash.readUIntBE(0, 6);
  return anchor;
};
