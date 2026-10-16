const NAMES = [
  'Biscuit', 'Luna', 'Rex', 'Pepper', 'Mochi', 'Hazel', 'Ziggy', 'Bramble', 'Juniper', 'Otis',
  'Clover', 'Waffles', 'Nala', 'Tofu', 'Maple', 'Pickles',
];
const CATEGORIES = ['Dogs', 'Cats', 'Rabbits', 'Birds', 'Reptiles', 'Fish'];

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const token = (): string => Math.random().toString(36).slice(2, 8).padEnd(6, '0');

/** A realistic, unique pet name such as `Biscuit 7f3k2q`, so tests never collide in the shared DB. */
export function makePetName(): string {
  return `${pick(NAMES)} ${token()}`;
}

export function makeCategory(): string {
  return pick(CATEGORIES);
}

/** A unique string of exactly `length` characters (length >= 7). */
export function makeExactLength(length: number): string {
  const head = `${pick(NAMES)} ${token()} `;
  return (head + 'x'.repeat(length)).slice(0, length);
}
