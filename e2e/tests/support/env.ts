/** Where the API under test lives. The web URL is Playwright's `baseURL` (WEB_URL). */
export const API_URL = process.env.API_URL ?? 'http://localhost:8000';

export const STATUSES = ['available', 'pending', 'sold'] as const;
export type PetStatus = (typeof STATUSES)[number];

/** 2^53: the first integer a JavaScript number cannot always hold exactly. */
export const TWO_POW_53 = 2n ** 53n;
