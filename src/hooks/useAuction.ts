import React, { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import { playerApi, teamApi, auctionApi } from '../services/api';
import { Player, Team, AuctionState, PlayerStatus, PlayerCategory } from '../../types';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../constants/socketEvents';
import { CATEGORY_BASE_PRICES } from '../../constants';

interface UseAuctionReturn {
  // State
  players: Player[];
  teams: Team[];
  auction: AuctionState;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Auction Actions
  startAuction: (playerId: string) => void;
  placeBid: (teamId: string, customAmount?: number) => void;
  matchBid: (teamId: string) => void;
  runLottery: () => void;
  finalizeSale: () => void;
  markUnsold: () => void;

  // Player Actions
  addPlayer: (player: Omit<Player, 'id' | 'status' | 'basePrice'>) => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  updatePlayerPhoto: (playerId: string, photoUrl: string) => Promise<void>;
  bulkUploadPhotos: (files: FileList) => Promise<void>;
  importPlayers: (players: Omit<Player, 'id' | 'status' | 'basePrice'>[]) => Promise<void>;
  clearAllPlayers: () => Promise<void>;

  // Team Actions
  addTeam: (team: Omit<Team, 'id' | 'remainingBudget'>) => Promise<void>;
  updateTeam: (team: Team) => Promise<void>;
  updateTeamLogo: (teamId: string, logoUrl: string) => Promise<void>;
  importTeams: (teams: Omit<Team, 'id' | 'remainingBudget'>[]) => Promise<void>;
  clearAllTeams: () => Promise<void>;

  // Utility
  requestSync: () => void;
  clearError: () => void;

  // Direct setters for local state updates
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}

// Helper to convert MongoDB _id to id
function normalizePlayer(p: any): Player {
  return {
    id: p._id || p.id,
    photoId: p.photoId,
    name: p.name,
    department: p.department,
    position: p.position,
    category: p.category as PlayerCategory,
    basePrice: p.basePrice,
    status: p.status as PlayerStatus,
    photoUrl: p.photoUrl,
    soldPrice: p.soldPrice,
    teamId: p.teamId,
    auctionRound: p.auctionRound
  };
}

function normalizeTeam(t: any): Team {
  return {
    id: t._id || t.id,
    name: t.name,
    owner: t.owner,
    initialBudget: t.initialBudget,
    remainingBudget: t.remainingBudget,
    logoUrl: t.logoUrl
  };
}

function normalizeAuction(a: any): AuctionState {
  return {
    currentPlayerId: a.currentPlayerId?._id || a.currentPlayerId || null,
    currentBid: a.currentBid || 0,
    biddingTeamIds: (a.biddingTeamIds || []).map((id: any) => id?._id || id),
    isActive: a.isActive || false
  };
}

export function useAuction(): UseAuctionReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auction, setAuction] = useState<AuctionState>({
    currentPlayerId: null,
    currentBid: 0,
    biddingTeamIds: [],
    isActive: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketInitialized = useRef(false);

  // Initialize socket connection and event handlers
  useEffect(() => {
    if (socketInitialized.current) return;
    socketInitialized.current = true;

    const socket = socketService.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit(CLIENT_EVENTS.JOIN_AUCTION);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle initial connection with full state
    socket.on(SERVER_EVENTS.CONNECTED, (data: any) => {
      console.log('Received initial state from server');
      if (data.players) setPlayers(data.players.map(normalizePlayer));
      if (data.teams) setTeams(data.teams.map(normalizeTeam));
      if (data.auctionState) setAuction(normalizeAuction(data.auctionState));
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    });

    // Handle full state sync
    socket.on(SERVER_EVENTS.FULL_STATE, (data: any) => {
      if (data.players) setPlayers(data.players.map(normalizePlayer));
      if (data.teams) setTeams(data.teams.map(normalizeTeam));
      if (data.auctionState) setAuction(normalizeAuction(data.auctionState));
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    });

    // Timeout to stop loading if server doesn't respond within 10 seconds
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    // Clear timeout when component unmounts or when loading is set to false
    return () => {
      clearTimeout(loadingTimeout);
    };

    // Auction events
    socket.on(SERVER_EVENTS.AUCTION_STARTED, (data: any) => {
      console.log('Received AUCTION_STARTED:', data);
      const normalized = normalizeAuction(data.auctionState);
      console.log('Normalized auction state:', normalized);
      setAuction(normalized);
    });

    socket.on(SERVER_EVENTS.BID_PLACED, (data: any) => {
      setAuction(normalizeAuction(data.auctionState));
    });

    socket.on(SERVER_EVENTS.BID_MATCHED, (data: any) => {
      setAuction(normalizeAuction(data.auctionState));
    });

    socket.on(SERVER_EVENTS.LOTTERY_RESULT, (data: any) => {
      setAuction(normalizeAuction(data.auctionState));
      if (data.winningTeam) {
        const winnerName = data.winningTeam.name;
        alert(`Lottery Result: ${winnerName} wins the tie!`);
      }
    });

    socket.on(SERVER_EVENTS.SALE_FINALIZED, (data: any) => {
      setAuction(normalizeAuction(data.auctionState));
      if (data.player) {
        const updatedPlayer = normalizePlayer(data.player);
        setPlayers((prev) =>
          prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
        );
      }
      if (data.team) {
        const updatedTeam = normalizeTeam(data.team);
        setTeams((prev) =>
          prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
        );
      }
    });

    // Player events
    socket.on(SERVER_EVENTS.PLAYER_UPDATE, (data: any) => {
      if (data.action === 'created' && data.player) {
        setPlayers((prev) => [...prev, normalizePlayer(data.player)]);
      } else if (data.action === 'updated' && data.player) {
        const updated = normalizePlayer(data.player);
        setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else if (data.action === 'deleted' && data.playerId) {
        setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
      }
    });

    socket.on(SERVER_EVENTS.PLAYERS_BULK_UPDATE, (data: any) => {
      if (data.action === 'cleared') {
        setPlayers([]);
      } else if (data.players) {
        setPlayers(data.players.map(normalizePlayer));
      }
    });

    // Team events
    socket.on(SERVER_EVENTS.TEAM_UPDATE, (data: any) => {
      if (data.action === 'created' && data.team) {
        setTeams((prev) => [...prev, normalizeTeam(data.team)]);
      } else if (data.action === 'updated' && data.team) {
        const updated = normalizeTeam(data.team);
        setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else if (data.action === 'deleted' && data.teamId) {
        setTeams((prev) => prev.filter((t) => t.id !== data.teamId));
      }
    });

    socket.on(SERVER_EVENTS.TEAMS_BULK_UPDATE, (data: any) => {
      if (data.action === 'cleared') {
        setTeams([]);
      } else if (data.teams) {
        setTeams(data.teams.map(normalizeTeam));
      }
    });

    // Error handling
    socket.on(SERVER_EVENTS.ERROR, (data: any) => {
      setError(data.message || 'An error occurred');
      alert(data.message || 'An error occurred');
    });

    // Fallback: fetch initial data via REST if socket doesn't connect quickly
    const timeoutId = setTimeout(async () => {
      if (!socketService.isConnected()) {
        console.log('Socket not connected, fetching via REST API');
        try {
          const data = await auctionApi.getFullState();
          if (data.players) setPlayers((data.players as any[]).map(normalizePlayer));
          if (data.teams) setTeams((data.teams as any[]).map(normalizeTeam));
          if (data.auctionState) setAuction(normalizeAuction(data.auctionState));
        } catch (err) {
          console.error('Failed to fetch initial state:', err);
          setError('Failed to connect to server');
        }
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      socketService.disconnect();
      socketInitialized.current = false;
    };
  }, []);

  // Auction Actions
  const startAuction = useCallback((playerId: string) => {
    console.log('Starting auction for player:', playerId);
    socketService.emit(CLIENT_EVENTS.START_AUCTION, { playerId });
  }, []);

  const placeBid = useCallback((teamId: string, customAmount?: number) => {
    socketService.emit(CLIENT_EVENTS.PLACE_BID, { teamId, customAmount });
  }, []);

  const matchBid = useCallback((teamId: string) => {
    socketService.emit(CLIENT_EVENTS.MATCH_BID, { teamId });
  }, []);

  const runLottery = useCallback(() => {
    socketService.emit(CLIENT_EVENTS.RUN_LOTTERY);
  }, []);

  const finalizeSale = useCallback(() => {
    socketService.emit(CLIENT_EVENTS.FINALIZE_SALE);
  }, []);

  const markUnsold = useCallback(() => {
    socketService.emit(CLIENT_EVENTS.MARK_UNSOLD);
  }, []);

  // Player Actions
  const addPlayer = useCallback(
    async (newPlayer: Omit<Player, 'id' | 'status' | 'basePrice'>) => {
      try {
        const response = await playerApi.create({
          name: newPlayer.name,
          department: newPlayer.department,
          position: newPlayer.position,
          category: newPlayer.category,
          photoId: newPlayer.photoId
        });
        // Server will broadcast the update
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add player');
        throw err;
      }
    },
    []
  );

  const updatePlayer = useCallback(async (player: Player) => {
    try {
      await playerApi.update(player.id, {
        name: player.name,
        department: player.department,
        position: player.position,
        category: player.category,
        photoId: player.photoId
      });
      // Server will broadcast the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update player');
      throw err;
    }
  }, []);

  const updatePlayerPhoto = useCallback(async (playerId: string, photoUrl: string) => {
    try {
      await playerApi.uploadPhoto(playerId, photoUrl);
      // Server will broadcast the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      throw err;
    }
  }, []);

  const bulkUploadPhotos = useCallback(async (files: FileList) => {
    try {
      await playerApi.bulkUploadPhotos(files);
      // Immediately fetch updated players to update local state
      const updatedPlayers = await playerApi.getAll();
      setPlayers(updatedPlayers.players.map(normalizePlayer));
      // Server will also broadcast the update for other clients
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk upload photos');
      throw err;
    }
  }, []);

  const importPlayers = useCallback(
    async (newPlayers: Omit<Player, 'id' | 'status' | 'basePrice'>[]) => {
      try {
        const result = await playerApi.bulkImport(newPlayers);
        // Immediately fetch updated players to update local state
        const updatedPlayers = await playerApi.getAll();
        setPlayers(updatedPlayers.players.map(normalizePlayer));
        // Server will also broadcast the update for other clients
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import players');
        throw err;
      }
    },
    []
  );

  const clearAllPlayers = useCallback(async () => {
    try {
      await playerApi.deleteAll();
      // Immediately clear local state
      setPlayers([]);
      // Server will also broadcast the update for other clients
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear players');
      throw err;
    }
  }, []);

  // Team Actions
  const addTeam = useCallback(
    async (newTeam: Omit<Team, 'id' | 'remainingBudget'>) => {
      try {
        await teamApi.create({
          name: newTeam.name,
          owner: newTeam.owner,
          initialBudget: newTeam.initialBudget
        });
        // Server will broadcast the update
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add team');
        throw err;
      }
    },
    []
  );

  const updateTeam = useCallback(async (team: Team) => {
    try {
      await teamApi.update(team.id, {
        name: team.name,
        owner: team.owner
      });
      // Server will broadcast the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team');
      throw err;
    }
  }, []);

  const updateTeamLogo = useCallback(async (teamId: string, logoUrl: string) => {
    try {
      await teamApi.uploadLogo(teamId, logoUrl);
      // Server will broadcast the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
      throw err;
    }
  }, []);

  const importTeams = useCallback(
    async (newTeams: Omit<Team, 'id' | 'remainingBudget'>[]) => {
      try {
        await teamApi.bulkImport(newTeams);
        // Server will broadcast the update
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import teams');
        throw err;
      }
    },
    []
  );

  const clearAllTeams = useCallback(async () => {
    try {
      await teamApi.deleteAll();
      // Server will broadcast the update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear teams');
      throw err;
    }
  }, []);

  // Utility
  const requestSync = useCallback(() => {
    socketService.emit(CLIENT_EVENTS.REQUEST_SYNC);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    players,
    teams,
    auction,
    isConnected,
    isLoading,
    error,

    // Auction Actions
    startAuction,
    placeBid,
    matchBid,
    runLottery,
    finalizeSale,
    markUnsold,

    // Player Actions
    addPlayer,
    updatePlayer,
    updatePlayerPhoto,
    bulkUploadPhotos,
    importPlayers,
    clearAllPlayers,

    // Team Actions
    addTeam,
    updateTeam,
    updateTeamLogo,
    importTeams,
    clearAllTeams,

    // Utility
    requestSync,
    clearError,

    // Direct setters
    setPlayers,
    setTeams
  };
}
