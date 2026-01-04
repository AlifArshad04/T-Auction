import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { auctionService } from '../services/auctionService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { SERVER_EVENTS } from '../socket/socketEvents';

export const getAuctionState = asyncHandler(async (req: Request, res: Response) => {
  const result = await auctionService.getCurrentAuction();
  res.json({ success: true, ...result });
});

export const getFullState = asyncHandler(async (_req: Request, res: Response) => {
  const result = await auctionService.getFullState();
  res.json({ success: true, ...result });
});

export const startAuction = asyncHandler(async (req: Request, res: Response) => {
  const { playerId } = req.body;

  if (!playerId) {
    throw createError('Player ID is required', 400);
  }

  const result = await auctionService.startAuction(playerId);

  if (!result.success) {
    throw createError(result.error || 'Failed to start auction', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.AUCTION_STARTED, {
    auctionState: result.auctionState,
    player: result.player
  });

  res.json({ success: true, auctionState: result.auctionState, player: result.player });
});

export const placeBid = asyncHandler(async (req: Request, res: Response) => {
  const { teamId, customAmount } = req.body;

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  const result = await auctionService.placeBid(teamId, customAmount);

  if (!result.success) {
    throw createError(result.error || 'Failed to place bid', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.BID_PLACED, {
    auctionState: result.auctionState,
    teamId,
    bidAmount: result.auctionState?.currentBid
  });

  res.json({ success: true, auctionState: result.auctionState });
});

export const matchBid = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.body;

  if (!teamId) {
    throw createError('Team ID is required', 400);
  }

  const result = await auctionService.matchBid(teamId);

  if (!result.success) {
    throw createError(result.error || 'Failed to match bid', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.BID_MATCHED, {
    auctionState: result.auctionState,
    teamId
  });

  res.json({ success: true, auctionState: result.auctionState });
});

export const runLottery = asyncHandler(async (req: Request, res: Response) => {
  const result = await auctionService.runLottery();

  if (!result.success) {
    throw createError(result.error || 'Failed to run lottery', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.LOTTERY_RESULT, {
    auctionState: result.auctionState,
    winningTeam: result.team
  });

  res.json({ success: true, auctionState: result.auctionState, winningTeam: result.team });
});

export const finalizeSale = asyncHandler(async (req: Request, res: Response) => {
  const result = await auctionService.finalizeSale(false);

  if (!result.success) {
    throw createError(result.error || 'Failed to finalize sale', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.SALE_FINALIZED, {
    auctionState: result.auctionState,
    player: result.player,
    team: result.team
  });

  res.json({
    success: true,
    auctionState: result.auctionState,
    player: result.player,
    team: result.team
  });
});

export const markUnsold = asyncHandler(async (req: Request, res: Response) => {
  const result = await auctionService.finalizeSale(true);

  if (!result.success) {
    throw createError(result.error || 'Failed to mark unsold', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.SALE_FINALIZED, {
    auctionState: result.auctionState,
    player: result.player,
    team: null
  });

  res.json({ success: true, auctionState: result.auctionState, player: result.player });
});

export const forceSell = asyncHandler(async (req: Request, res: Response) => {
  const { playerId, teamId, amount } = req.body;

  if (!playerId || !teamId || amount === undefined) {
    throw createError('Player ID, Team ID, and amount are required', 400);
  }

  if (typeof amount !== 'number' || amount <= 0) {
    throw createError('Amount must be a positive number', 400);
  }

  const result = await auctionService.forceSell(playerId, teamId, amount);

  if (!result.success) {
    throw createError(result.error || 'Failed to force sell player', 400);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.SALE_FINALIZED, {
    auctionState: result.auctionState,
    player: result.player,
    team: result.team
  });

  res.json({
    success: true,
    auctionState: result.auctionState,
    player: result.player,
    team: result.team
  });
});

export const resetAuction = asyncHandler(async (req: Request, res: Response) => {
  const result = await auctionService.resetAuction();

  if (!result.success) {
    throw createError(result.error || 'Failed to reset auction', 400);
  }

  // Broadcast full state to all clients
  const fullState = await auctionService.getFullState();
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.FULL_STATE, fullState);

  res.json({ success: true, auctionState: result.auctionState });
});
