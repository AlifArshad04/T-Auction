import mongoose from 'mongoose';
import { Player, IPlayer, PlayerStatus, PlayerCategory } from '../models/Player';
import { Team, ITeam } from '../models/Team';
import { AuctionState, getAuctionState, IAuctionState } from '../models/AuctionState';
import { validateBid } from './bidValidationService';
import { getDynamicIncrement, CATEGORY_BASE_PRICES } from '../utils/constants';

export interface AuctionResult {
  success: boolean;
  error?: string;
  auctionState?: IAuctionState;
  player?: IPlayer;
  team?: ITeam;
}

export interface FullState {
  auctionState: IAuctionState;
  players: IPlayer[];
  teams: ITeam[];
}

class AuctionService {
  async startAuction(playerId: string): Promise<AuctionResult> {
    console.log('Starting auction for playerId:', playerId);
    const player = await Player.findById(playerId);
    if (!player) {
      console.log('Player not found');
      return { success: false, error: 'Player not found' };
    }

    if (player.status === PlayerStatus.SOLD) {
      console.log('Player already sold');
      return { success: false, error: 'Player already sold' };
    }

    if (player.status === PlayerStatus.DISTRIBUTED) {
      console.log('Player has been distributed');
      return { success: false, error: 'Player has been distributed' };
    }

    const state = await getAuctionState();
    console.log('Current auction state before start:', {
      isActive: state.isActive,
      currentPlayerId: state.currentPlayerId,
      currentBid: state.currentBid
    });

    if (state.isActive) {
      console.log('Auction already in progress');
      return { success: false, error: 'An auction is already in progress' };
    }

    state.currentPlayerId = player._id;
    state.currentBid = player.basePrice;
    state.biddingTeamIds = [];
    state.isActive = true;
    await state.save();

    console.log('Auction state after start:', {
      isActive: state.isActive,
      currentPlayerId: state.currentPlayerId,
      currentBid: state.currentBid
    });

    return { success: true, auctionState: state, player };
  }

  async placeBid(teamId: string, customAmount?: number): Promise<AuctionResult> {
    const state = await getAuctionState();
    if (!state.isActive || !state.currentPlayerId) {
      return { success: false, error: 'No active auction' };
    }

    const player = await Player.findById(state.currentPlayerId);
    const team = await Team.findById(teamId);
    const allPlayers = await Player.find();

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (!team) {
      return { success: false, error: 'Team not found' };
    }

    const increment = getDynamicIncrement(player.category, state.currentBid);
    let nextBid: number;

    if (customAmount !== undefined) {
      // Custom bid amount
      if (state.biddingTeamIds.length > 0) {
        const diff = customAmount - state.currentBid;
        if (diff < increment) {
          return {
            success: false,
            error: `Minimum increment is ৳${increment.toLocaleString()}. Your bid must be at least ৳${(state.currentBid + increment).toLocaleString()}`
          };
        }
      } else if (customAmount < player.basePrice) {
        return {
          success: false,
          error: `Bid must be at least the base price: ৳${player.basePrice.toLocaleString()}`
        };
      }
      nextBid = customAmount;
    } else {
      // Standard increment bid
      if (state.biddingTeamIds.length === 0) {
        // First bid - use base price
        nextBid = state.currentBid;
      } else {
        // Increment from current bid
        nextBid = state.currentBid + increment;
      }
    }

    // Validate the bid
    const validation = await validateBid(team, player, nextBid, allPlayers);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Update auction state
    state.currentBid = nextBid;
    state.biddingTeamIds = [new mongoose.Types.ObjectId(teamId)];
    await state.save();

    return { success: true, auctionState: state, team };
  }

  async matchBid(teamId: string): Promise<AuctionResult> {
    const state = await getAuctionState();
    if (!state.isActive || !state.currentPlayerId) {
      return { success: false, error: 'No active auction' };
    }

    if (state.biddingTeamIds.length === 0) {
      return { success: false, error: 'No bid to match' };
    }

    // Check if team is already in the bidding list
    if (state.biddingTeamIds.some((id) => id.toString() === teamId)) {
      return { success: false, error: 'Team has already matched this bid' };
    }

    const player = await Player.findById(state.currentPlayerId);
    const team = await Team.findById(teamId);
    const allPlayers = await Player.find();

    if (!player || !team) {
      return { success: false, error: 'Player or team not found' };
    }

    // Validate matching the current bid
    const validation = await validateBid(team, player, state.currentBid, allPlayers);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Add team to bidding list (at front to indicate most recent match)
    const teamObjectId = new mongoose.Types.ObjectId(teamId);
    state.biddingTeamIds = [teamObjectId, ...state.biddingTeamIds];
    await state.save();

    return { success: true, auctionState: state, team };
  }

  async runLottery(): Promise<AuctionResult> {
    const state = await getAuctionState();
    if (!state.isActive) {
      return { success: false, error: 'No active auction' };
    }

    if (state.biddingTeamIds.length < 2) {
      return { success: false, error: 'Lottery requires at least 2 bidders' };
    }

    const randomIndex = Math.floor(Math.random() * state.biddingTeamIds.length);
    const winnerId = state.biddingTeamIds[randomIndex];

    state.biddingTeamIds = [winnerId];
    await state.save();

    const winningTeam = await Team.findById(winnerId);
    return { success: true, auctionState: state, team: winningTeam || undefined };
  }

  async finalizeSale(markUnsold: boolean = false): Promise<AuctionResult> {
    const state = await getAuctionState();
    if (!state.isActive || !state.currentPlayerId) {
      return { success: false, error: 'No active auction' };
    }

    const player = await Player.findById(state.currentPlayerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    let updatedTeam: ITeam | null = null;

    if (markUnsold || state.biddingTeamIds.length === 0) {
      // No bids - handle unsold logic
      const currentRound = player.auctionRound || 1;

      if (currentRound === 1) {
        // First unsold: move to round 2
        player.status = PlayerStatus.UNSOLD;
        player.auctionRound = 2;
      } else {
        // Second unsold
        if (player.category === PlayerCategory.A) {
          // Cat A unsold twice -> downgrade to Cat B
          player.category = PlayerCategory.B;
          player.basePrice = CATEGORY_BASE_PRICES.B;
          player.status = PlayerStatus.UNSOLD;
          player.auctionRound = 1; // Reset for new category
        } else if (player.category === PlayerCategory.C) {
          // Cat C second unsold -> DISTRIBUTED
          player.status = PlayerStatus.DISTRIBUTED;
        }
        // Cat B remains UNSOLD with auctionRound = 2
      }
    } else {
      // Player sold to highest bidder (first in array)
      const winnerId = state.biddingTeamIds[0];
      player.status = PlayerStatus.SOLD;
      player.soldPrice = state.currentBid;
      player.teamId = winnerId;

      // Deduct budget from winning team
      updatedTeam = await Team.findByIdAndUpdate(
        winnerId,
        { $inc: { remainingBudget: -state.currentBid } },
        { new: true }
      );
    }

    await player.save();

    // Reset auction state
    state.currentPlayerId = null;
    state.currentBid = 0;
    state.biddingTeamIds = [];
    state.isActive = false;
    await state.save();

    return {
      success: true,
      auctionState: state,
      player,
      team: updatedTeam || undefined
    };
  }

  async resetAuction(): Promise<AuctionResult> {
    const state = await getAuctionState();

    state.currentPlayerId = null;
    state.currentBid = 0;
    state.biddingTeamIds = [];
    state.isActive = false;
    await state.save();

    return { success: true, auctionState: state };
  }

  async resetFullAuction(): Promise<FullState> {
    // Reset all players to initial state and restore original category
    const players = await Player.find();
    for (const player of players) {
      // Restore original category if it was changed (e.g., Cat A downgraded to Cat B)
      if (player.originalCategory) {
        player.category = player.originalCategory;
      }
      player.basePrice = CATEGORY_BASE_PRICES[player.category as keyof typeof CATEGORY_BASE_PRICES];
      player.status = PlayerStatus.UNSOLD;
      player.auctionRound = 1;
      player.soldPrice = undefined;
      player.teamId = undefined;
      await player.save();
    }

    // Reset all teams' remaining budget to initial budget
    const teams = await Team.find();
    for (const team of teams) {
      team.remainingBudget = team.initialBudget;
      await team.save();
    }

    // Reset auction state
    const state = await getAuctionState();
    state.currentPlayerId = null;
    state.currentBid = 0;
    state.biddingTeamIds = [];
    state.isActive = false;
    await state.save();

    // Return full state
    const updatedPlayers = await Player.find().sort({ category: 1, name: 1 });
    const updatedTeams = await Team.find().sort({ name: 1 });

    return {
      auctionState: state,
      players: updatedPlayers,
      teams: updatedTeams
    };
  }

  async getFullState(): Promise<FullState> {
    const [auctionState, players, teams] = await Promise.all([
      getAuctionState(),
      Player.find().sort({ category: 1, name: 1 }),
      Team.find().sort({ name: 1 })
    ]);

    return { auctionState, players, teams };
  }

  async getCurrentAuction() {
    const state = await getAuctionState();
    if (!state.isActive || !state.currentPlayerId) {
      return { auctionState: state, player: null, biddingTeams: [] };
    }

    const [player, biddingTeams] = await Promise.all([
      Player.findById(state.currentPlayerId),
      Team.find({ _id: { $in: state.biddingTeamIds } })
    ]);

    return { auctionState: state, player, biddingTeams };
  }
}

export const auctionService = new AuctionService();
