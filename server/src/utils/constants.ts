// Category base prices (in Bengali Taka)
export const CATEGORY_BASE_PRICES = {
  A: 15000,
  B: 8000,
  C: 5000
} as const;

// Squad requirements
export const MIN_SQUAD_SIZE = 10;
export const CAT_A_MAX_SPEND = 60000;
export const MIN_CAT_AB = 5; // Cat A + Cat B combined = exactly 5
export const MIN_CAT_C = 5;  // Cat C minimum = 5
export const DEFAULT_TEAM_BUDGET = 130000;
export const MIN_BUDGET_AFTER_CAT_B = 25000; // Must have 25k after Cat B auction

// Dynamic bid increment based on category and current bid
export function getDynamicIncrement(category: string, currentBid: number): number {
  if (category === 'A') {
    return currentBid < 20000 ? 1000 : 2000;
  } else {
    return currentBid < 10000 ? 500 : 1000;
  }
}
