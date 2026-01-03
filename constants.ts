
import { PlayerCategory } from './types';

export const CATEGORY_BASE_PRICES: Record<PlayerCategory, number> = {
  [PlayerCategory.A]: 15000,
  [PlayerCategory.B]: 8000,
  [PlayerCategory.C]: 5000,
};

export const MIN_SQUAD_SIZE = 10;
export const CAT_A_MAX_SPEND = 60000;
export const MIN_CAT_A = 1;
export const MIN_CAT_B = 3;
export const MIN_CAT_C = 4;

export const DEFAULT_TEAM_BUDGET = 130000;

export const INITIAL_TEAMS = [];

export const getDynamicIncrement = (category: PlayerCategory, currentBid: number): number => {
  if (category === PlayerCategory.A) {
    return currentBid < 20000 ? 1000 : 2000;
  } else {
    return currentBid < 10000 ? 500 : 1000;
  }
};
