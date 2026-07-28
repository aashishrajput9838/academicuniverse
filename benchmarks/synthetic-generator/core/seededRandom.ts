/**
 * Academic Universe — Mulberry32 Seeded Pseudo-Random Number Generator (PRNG)
 * Guarantees 100% reproducible data generation across platforms and runs.
 */

export class SeededRandom {
  private state: number;
  public readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed >>> 0;
  }

  /** Return a pseudo-random float in range [0, 1) */
  nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Return a pseudo-random integer in range [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  pick<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array');
    const index = Math.floor(this.nextFloat() * array.length);
    return array[index];
  }

  /** Pick multiple distinct random elements from an array */
  pickMultiple<T>(array: T[], count: number): T[] {
    const copy = [...array];
    this.shuffle(copy);
    return copy.slice(0, Math.min(count, copy.length));
  }

  /** Shuffle an array in-place using Fisher-Yates */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.nextFloat() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Generate a random formatted date string YYYY-MM-DD */
  nextDate(startYear = 2021, endYear = 2026): string {
    const year = this.nextInt(startYear, endYear);
    const month = String(this.nextInt(1, 12)).padStart(2, '0');
    const day = String(this.nextInt(1, 28)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Derived child seed for sub-generators */
  childSeed(): number {
    return Math.floor(this.nextFloat() * 2147483647);
  }
}
