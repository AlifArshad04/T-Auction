// Category base prices (in Bengali Taka)
export const CATEGORY_BASE_PRICES = {
  A: 15000,
  B: 8000,
  C: 5000
} as const;

// Squad requirements
export const MIN_SQUAD_SIZE = 10;
export const CAT_A_MAX_SPEND = 60000;
export const MIN_CAT_A = 1;
export const MIN_CAT_B = 3;
export const MIN_CAT_C = 4;
export const DEFAULT_TEAM_BUDGET = 130000;

// Dynamic bid increment based on category and current bid
export function getDynamicIncrement(category: string, currentBid: number): number {
  if (category === 'A') {
    return currentBid < 20000 ? 1000 : 2000;
  } else {
    return currentBid < 10000 ? 500 : 1000;
  }
}
