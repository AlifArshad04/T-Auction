import { Server, Socket } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from './socketEvents';
import { auctionService } from '../services/auctionService';
import { verifyAdminAuth } from '../middleware/authMiddleware';

export function initializeSocketHandlers(io: Server): void {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Helper function to check admin authentication
    const isAdminAuthenticated = (authHeader?: string): boolean => {
      return verifyAdminAuth(authHeader);
    };

    // Send current full state to newly connected client
    try {
      const fullState = await auctionService.getFullState();
      socket.emit(SERVER_EVENTS.CONNECTED, {
        socketId: socket.id,
        auctionState: {
          _id: fullState.auctionState._id,
          currentPlayerId: fullState.auctionState.currentPlayerId?.toString() || null,
          currentBid: fullState.auctionState.currentBid,
          biddingTeamIds: fullState.auctionState.biddingTeamIds.map((id: any) => id?.toString()),
          isActive: fullState.auctionState.isActive
        },
        players: fullState.players,
        teams: fullState.teams
      });
    } catch (error) {
      console.error('Error sending initial state:', error);
    }

    // Handle join auction room
    socket.on(CLIENT_EVENTS.JOIN_AUCTION, async () => {
      socket.join('auction_room');
      try {
        const state = await auctionService.getFullState();
        socket.emit(SERVER_EVENTS.FULL_STATE, {
          auctionState: {
            _id: state.auctionState._id,
            currentPlayerId: state.auctionState.currentPlayerId?.toString() || null,
            currentBid: state.auctionState.currentBid,
            biddingTeamIds: state.auctionState.biddingTeamIds.map((id: any) => id?.toString()),
            isActive: state.auctionState.isActive
          },
          players: state.players,
          teams: state.teams
        });
      } catch (error) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to get auction state' });
      }
    });

    // Request full sync
    socket.on(CLIENT_EVENTS.REQUEST_SYNC, async () => {
      try {
        const state = await auctionService.getFullState();
        socket.emit(SERVER_EVENTS.FULL_STATE, {
          auctionState: {
            _id: state.auctionState._id,
            currentPlayerId: state.auctionState.currentPlayerId?.toString() || null,
            currentBid: state.auctionState.currentBid,
            biddingTeamIds: state.auctionState.biddingTeamIds.map((id: any) => id?.toString()),
            isActive: state.auctionState.isActive
          },
          players: state.players,
          teams: state.teams
        });
      } catch (error) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to sync state' });
      }
    });

    // Start Auction
    socket.on(CLIENT_EVENTS.START_AUCTION, async (data: { playerId: string }) => {
      console.log('Server received START_AUCTION for player:', data.playerId);
      try {
        const result = await auctionService.startAuction(data.playerId);
        console.log('Auction start result:', result);
        if (result.success && result.auctionState) {
          console.log('Emitting AUCTION_STARTED:', result.auctionState);
          io.emit(SERVER_EVENTS.AUCTION_STARTED, {
            auctionState: {
              _id: result.auctionState._id,
              currentPlayerId: result.auctionState.currentPlayerId?.toString() || null,
              currentBid: result.auctionState.currentBid,
              biddingTeamIds: result.auctionState.biddingTeamIds.map((id: any) => id?.toString()),
              isActive: result.auctionState.isActive
            },
            player: result.player
          });
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        }
      } catch (error) {
        console.error('Error starting auction:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to start auction' });
      }
    });

    // Place Bid
    socket.on(
      CLIENT_EVENTS.PLACE_BID,
      async (data: { teamId: string; customAmount?: number }) => {
        console.log('Server received PLACE_BID:', data);
        try {
          const result = await auctionService.placeBid(data.teamId, data.customAmount);
          console.log('Place bid result:', result);
          if (result.success && result.auctionState) {
            console.log('Emitting BID_PLACED');
            io.emit(SERVER_EVENTS.BID_PLACED, {
              auctionState: {
                _id: result.auctionState._id,
                currentPlayerId: result.auctionState.currentPlayerId?.toString() || null,
                currentBid: result.auctionState.currentBid,
                biddingTeamIds: result.auctionState.biddingTeamIds.map((id: any) => id?.toString()),
                isActive: result.auctionState.isActive
              },
              teamId: data.teamId,
              bidAmount: result.auctionState.currentBid
            });
          } else {
            socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
          }
        } catch (error) {
          console.error('Error placing bid:', error);
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to place bid' });
        }
      }
    );

    // Match Bid
    socket.on(CLIENT_EVENTS.MATCH_BID, async (data: { teamId: string }) => {
      console.log('Server received MATCH_BID:', data);
      try {
        const result = await auctionService.matchBid(data.teamId);
        console.log('Match bid result:', result);
        if (result.success && result.auctionState) {
          console.log('Emitting BID_MATCHED');
          io.emit(SERVER_EVENTS.BID_MATCHED, {
            auctionState: {
              _id: result.auctionState._id,
              currentPlayerId: result.auctionState.currentPlayerId?.toString() || null,
              currentBid: result.auctionState.currentBid,
              biddingTeamIds: result.auctionState.biddingTeamIds.map((id: any) => id?.toString()),
              isActive: result.auctionState.isActive
            },
            teamId: data.teamId
          });
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        }
      } catch (error) {
        console.error('Error matching bid:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to match bid' });
      }
    });

    // Run Lottery
    socket.on(CLIENT_EVENTS.RUN_LOTTERY, async () => {
      try {
        const result = await auctionService.runLottery();
        if (result.success) {
          io.emit(SERVER_EVENTS.LOTTERY_RESULT, {
            auctionState: result.auctionState,
            winningTeam: result.team
          });
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        }
      } catch (error) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to run lottery' });
      }
    });

    // Finalize Sale
    socket.on(CLIENT_EVENTS.FINALIZE_SALE, async () => {
      try {
        const result = await auctionService.finalizeSale(false);
        if (result.success) {
          io.emit(SERVER_EVENTS.SALE_FINALIZED, {
            auctionState: result.auctionState,
            player: result.player,
            team: result.team
          });
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        }
      } catch (error) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to finalize sale' });
      }
    });

    // Mark Unsold
    socket.on(CLIENT_EVENTS.MARK_UNSOLD, async () => {
      try {
        const result = await auctionService.finalizeSale(true);
        if (result.success) {
          io.emit(SERVER_EVENTS.SALE_FINALIZED, {
            auctionState: result.auctionState,
            player: result.player,
            team: null
          });
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        }
      } catch (error) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to mark unsold' });
      }
    });

    // Force Sell (Admin only)
    socket.on(CLIENT_EVENTS.FORCE_SELL, async (data: { playerId: string; teamId: string; amount: number; auth?: string }) => {
      if (!isAdminAuthenticated(data.auth)) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Admin authentication required' });
        return;
      }

      try {
        const result = await auctionService.forceSell(data.playerId, data.teamId, data.amount);
        if (result.success) {
          io.emit(SERVER_EVENTS.SALE_FINALIZED, {
            auctionState: result.auctionState,
            player: result.player,
            team: result.team
          });
        } else {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        }
      } catch (error) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to force sell player' });
      }
    });

    // Reset Full Auction (Admin only)
    socket.on(CLIENT_EVENTS.RESET_AUCTION, async (data: { auth?: string } = {}) => {
      if (!isAdminAuthenticated(data.auth)) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Admin authentication required' });
        return;
      }

      console.log('Server received RESET_AUCTION');
      try {
        const fullState = await auctionService.resetFullAuction();
        io.emit(SERVER_EVENTS.AUCTION_RESET, {
          auctionState: {
            _id: fullState.auctionState._id,
            currentPlayerId: null,
            currentBid: 0,
            biddingTeamIds: [],
            isActive: false
          },
          players: fullState.players,
          teams: fullState.teams
        });
      } catch (error) {
        console.error('Error resetting auction:', error);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to reset auction' });
      }
    });

    // Broadcast player updates to all other clients
    socket.on(CLIENT_EVENTS.PLAYER_CREATED, (player) => {
      socket.broadcast.emit(SERVER_EVENTS.PLAYER_UPDATE, { player, action: 'created' });
    });

    socket.on(CLIENT_EVENTS.PLAYER_UPDATED, (player) => {
      socket.broadcast.emit(SERVER_EVENTS.PLAYER_UPDATE, { player, action: 'updated' });
    });

    socket.on(CLIENT_EVENTS.PLAYER_DELETED, (playerId) => {
      socket.broadcast.emit(SERVER_EVENTS.PLAYER_UPDATE, { playerId, action: 'deleted' });
    });

    socket.on(CLIENT_EVENTS.PLAYERS_IMPORTED, (players) => {
      socket.broadcast.emit(SERVER_EVENTS.PLAYERS_BULK_UPDATE, { players, action: 'imported' });
    });

    socket.on(CLIENT_EVENTS.PLAYERS_CLEARED, () => {
      socket.broadcast.emit(SERVER_EVENTS.PLAYERS_BULK_UPDATE, { players: [], action: 'cleared' });
    });

    // Broadcast team updates to all other clients
    socket.on(CLIENT_EVENTS.TEAM_CREATED, (team) => {
      socket.broadcast.emit(SERVER_EVENTS.TEAM_UPDATE, { team, action: 'created' });
    });

    socket.on(CLIENT_EVENTS.TEAM_UPDATED, (team) => {
      socket.broadcast.emit(SERVER_EVENTS.TEAM_UPDATE, { team, action: 'updated' });
    });

    socket.on(CLIENT_EVENTS.TEAM_DELETED, (teamId) => {
      socket.broadcast.emit(SERVER_EVENTS.TEAM_UPDATE, { teamId, action: 'deleted' });
    });

    socket.on(CLIENT_EVENTS.TEAMS_IMPORTED, (teams) => {
      socket.broadcast.emit(SERVER_EVENTS.TEAMS_BULK_UPDATE, { teams, action: 'imported' });
    });

    socket.on(CLIENT_EVENTS.TEAMS_CLEARED, () => {
      socket.broadcast.emit(SERVER_EVENTS.TEAMS_BULK_UPDATE, { teams: [], action: 'cleared' });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// Helper to broadcast from REST API controllers
export function broadcastEvent(io: Server, event: string, data: unknown): void {
  io.emit(event, data);
}
