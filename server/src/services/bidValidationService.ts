import { ITeam } from '../models/Team';
import { IPlayer, PlayerCategory, PlayerStatus } from '../models/Player';
import {
  CATEGORY_BASE_PRICES,
  CAT_A_MAX_SPEND,
  MIN_SQUAD_SIZE,
  MIN_CAT_AB,
  MIN_CAT_C,
  MIN_BUDGET_AFTER_CAT_B
} from '../utils/constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateBid(
  team: ITeam,
  player: IPlayer,
  bidAmount: number,
  allPlayers: IPlayer[]
): Promise<ValidationResult> {
  // Rule: Total Purse - Cannot exceed remaining budget
  if (bidAmount > team.remainingBudget) {
    return { valid: false, error: 'Insufficient budget. Bid exceeds remaining purse.' };
  }

  // Get team's current squad
  const squad = allPlayers.filter(
    (p) => p.teamId?.toString() === team._id.toString() && p.status === PlayerStatus.SOLD
  );

  const catAPlayers = squad.filter((p) => p.category === PlayerCategory.A);
  const catBPlayers = squad.filter((p) => p.category === PlayerCategory.B);
  const catCPlayers = squad.filter((p) => p.category === PlayerCategory.C);

  // Rule 1: Category A Max Spend (60k limit)
  if (player.category === PlayerCategory.A) {
    const currentCatASpend = catAPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
    if (currentCatASpend + bidAmount > CAT_A_MAX_SPEND) {
      return {
        valid: false,
        error: `Exceeds Category A spending limit. Current: ৳${currentCatASpend.toLocaleString()}, Max: ৳${CAT_A_MAX_SPEND.toLocaleString()}`
      };
    }
  }

  // Calculate slots needed for squad completion
  const currentSquadSize = squad.length;
  const slotsAfterThisPurchase = MIN_SQUAD_SIZE - currentSquadSize - 1;

  if (slotsAfterThisPurchase > 0) {
    // Calculate minimum category requirements after this purchase
    // Rule: Cat A + Cat B = 5 (combined), Cat C = 5 minimum
    const willHaveCatAB = catAPlayers.length + catBPlayers.length +
      (player.category === PlayerCategory.A || player.category === PlayerCategory.B ? 1 : 0);
    const willHaveCatC = catCPlayers.length + (player.category === PlayerCategory.C ? 1 : 0);

    const needsAB = Math.max(0, MIN_CAT_AB - willHaveCatAB);
    const needsC = Math.max(0, MIN_CAT_C - willHaveCatC);

    const specificSlotsNeeded = needsAB + needsC;
    const genericSlotsNeeded = Math.max(0, slotsAfterThisPurchase - specificSlotsNeeded);

    // Calculate minimum reserve required
    // For Cat A+B slots, use Cat B base price (cheaper option)
    const minReserve =
      needsAB * CATEGORY_BASE_PRICES.B +
      needsC * CATEGORY_BASE_PRICES.C +
      genericSlotsNeeded * CATEGORY_BASE_PRICES.C;

    const budgetAfterBid = team.remainingBudget - bidAmount;

    if (budgetAfterBid < minReserve) {
      return {
        valid: false,
        error: `Must reserve ৳${minReserve.toLocaleString()} for remaining squad requirements. Budget after bid: ৳${budgetAfterBid.toLocaleString()}`
      };
    }
  }

  // Rule 3: End of Category B Budget Rule - must have 25k after Cat B auction ends
  const remainingCatBPlayers = allPlayers.filter(
    (p) => p.category === PlayerCategory.B && p.status === PlayerStatus.UNSOLD
  ).length;

  const isCatBDepleted =
    remainingCatBPlayers === 0 ||
    (remainingCatBPlayers === 1 && player.category === PlayerCategory.B);

  if (isCatBDepleted) {
    const futureBudget = team.remainingBudget - bidAmount;

    if (futureBudget < MIN_BUDGET_AFTER_CAT_B) {
      return {
        valid: false,
        error: `End of Category B rule: Must maintain ৳${MIN_BUDGET_AFTER_CAT_B.toLocaleString()} budget after Cat B auction`
      };
    }
  }

  return { valid: true };
}
