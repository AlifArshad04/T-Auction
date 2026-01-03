
import React, { useState, useEffect } from 'react';
import { Player, Team, AuctionState, UserRole, PlayerStatus, PlayerCategory } from './types';
import { 
  CATEGORY_BASE_PRICES, 
  INITIAL_TEAMS, 
  getDynamicIncrement, 
  CAT_A_MAX_SPEND, 
  MIN_SQUAD_SIZE,
  MIN_CAT_A,
  MIN_CAT_B,
  MIN_CAT_C
} from './constants';
import { Layout } from './components/Layout';
import { AuctionDashboard } from './components/AuctionDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { TeamManagement } from './components/TeamManagement';
import { Reports } from './components/Reports';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auction' | 'players' | 'teams' | 'reports'>('auction');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [auction, setAuction] = useState<AuctionState>({
    currentPlayerId: null,
    currentBid: 0,
    biddingTeamIds: [],
    isActive: false
  });

  useEffect(() => {
    try {
      const savedPlayers = localStorage.getItem('therap_players');
      const savedTeams = localStorage.getItem('therap_teams');
      if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
      if (savedTeams) setTeams(JSON.parse(savedTeams));
    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('therap_players', JSON.stringify(players));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        alert("Browser Storage Full! Some photos could not be saved. Please try using smaller image files or clearing your browser cache for this site.");
      }
      console.error("Persistence Error:", e);
    }
  }, [players]);

  useEffect(() => {
    try {
      localStorage.setItem('therap_teams', JSON.stringify(teams));
    } catch (e) {
      console.error("Persistence Error:", e);
    }
  }, [teams]);

  const validateBid = (teamId: string, bidAmount: number): { valid: boolean; error?: string } => {
    const team = teams.find(t => t.id === teamId);
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!team || !player) return { valid: false, error: 'Internal Error' };

    // Rule: Total Purse
    if (bidAmount > team.remainingBudget) return { valid: false, error: 'Insufficient total budget' };

    const squad = players.filter(p => p.teamId === team.id);
    const catAPlayers = squad.filter(p => p.category === PlayerCategory.A);
    const catBPlayers = squad.filter(p => p.category === PlayerCategory.B);
    const catCPlayers = squad.filter(p => p.category === PlayerCategory.C);

    // Rule 1: Category A Max Spend
    if (player.category === PlayerCategory.A) {
      const currentCatASpend = catAPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
      if (currentCatASpend + bidAmount > CAT_A_MAX_SPEND) return { valid: false, error: 'Exceeds Cat A 60k limit' };
    }

    // Rule 7 & 2: Squad Completion & Minimum Quotas
    const slotsLeft = MIN_SQUAD_SIZE - squad.length - 1; 
    
    const needsA = Math.max(0, MIN_CAT_A - (catAPlayers.length + (player.category === PlayerCategory.A ? 1 : 0)));
    const needsB = Math.max(0, MIN_CAT_B - (catBPlayers.length + (player.category === PlayerCategory.B ? 1 : 0)));
    const needsC = Math.max(0, MIN_CAT_C - (catCPlayers.length + (player.category === PlayerCategory.C ? 1 : 0)));
    
    const specificSlotsNeeded = needsA + needsB + needsC;
    const genericSlotsNeeded = Math.max(0, slotsLeft - specificSlotsNeeded);
    
    const minReserve = (needsA * CATEGORY_BASE_PRICES[PlayerCategory.A]) + 
                       (needsB * CATEGORY_BASE_PRICES[PlayerCategory.B]) + 
                       (needsC * CATEGORY_BASE_PRICES[PlayerCategory.C]) + 
                       (genericSlotsNeeded * CATEGORY_BASE_PRICES[PlayerCategory.C]);

    if (team.remainingBudget - bidAmount < minReserve) {
      return { valid: false, error: 'Must reserve funds for remaining squad requirements' };
    }

    // Rule 3: End of Category B Budget Rule
    const remainingCatB = players.filter(p => p.category === PlayerCategory.B && p.status === PlayerStatus.UNSOLD).length;
    if (remainingCatB === 0 || (remainingCatB === 1 && player.category === PlayerCategory.B)) {
      const futureSquadSize = squad.length + 1;
      const futureBudget = team.remainingBudget - bidAmount;
      if (futureSquadSize >= 6 && futureBudget < 20000) {
        return { valid: false, error: 'End of Cat B: Must have 20k left if squad >= 6' };
      }
    }

    return { valid: true };
  };

  const handleStartAuction = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    setAuction({
      currentPlayerId: playerId,
      currentBid: player.basePrice,
      biddingTeamIds: [],
      isActive: true
    });
  };

  const handleIncreaseBid = (teamId: string, customAmount?: number) => {
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    const inc = getDynamicIncrement(player.category, auction.currentBid);
    const nextBid = customAmount !== undefined ? customAmount : 
                  (auction.biddingTeamIds.length === 0 ? auction.currentBid : auction.currentBid + inc);
    
    if (customAmount !== undefined && auction.biddingTeamIds.length > 0) {
        const diff = customAmount - auction.currentBid;
        if (diff < inc) {
            alert(`Minimum increment for this price level is ${inc}`);
            return;
        }
    }

    const validation = validateBid(teamId, nextBid);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setAuction(prev => ({
      ...prev,
      currentBid: nextBid,
      biddingTeamIds: [teamId]
    }));
  };

  const handleMatchBid = (teamId: string) => {
    const validation = validateBid(teamId, auction.currentBid);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setAuction(prev => {
      const otherTeams = prev.biddingTeamIds.filter(id => id !== teamId);
      return {
        ...prev,
        biddingTeamIds: [teamId, ...otherTeams]
      };
    });
  };

  const handleFinalizeSale = () => {
    const player = players.find(p => p.id === auction.currentPlayerId);
    if (!player) return;

    if (auction.biddingTeamIds.length === 0) {
      const currentRound = player.auctionRound || 1;
      if (currentRound === 1) {
        // First unsold: move to round 2
        setPlayers(prev => prev.map(p => 
          p.id === player.id ? { ...p, status: PlayerStatus.UNSOLD, auctionRound: 2 } : p
        ));
      } else {
        // Second unsold: check for special transitions
        if (player.category === PlayerCategory.A) {
          // SPECIAL RULE: Cat A remains unsold twice -> Downgrade to Cat B
          const newBase = CATEGORY_BASE_PRICES[PlayerCategory.B];
          setPlayers(prev => prev.map(p => 
            p.id === player.id ? { 
              ...p, 
              category: PlayerCategory.B, 
              basePrice: newBase,
              status: PlayerStatus.UNSOLD,
              auctionRound: 1 // Reset for its new category life
            } : p
          ));
          alert(`SYSTEM UPDATE: ${player.name} remains unsold in Round 2. Downgraded to Category B (New Base: ৳${newBase})`);
        } else if (player.category === PlayerCategory.C) {
          setPlayers(prev => prev.map(p => 
            p.id === player.id ? { ...p, status: PlayerStatus.DISTRIBUTED } : p
          ));
        } else {
          // Standard Unsold for Cat B
          setPlayers(prev => prev.map(p => 
            p.id === player.id ? { ...p, status: PlayerStatus.UNSOLD } : p
          ));
        }
      }
    } else {
      const winnerId = auction.biddingTeamIds[0];
      setPlayers(prev => prev.map(p => 
        p.id === player.id ? { ...p, status: PlayerStatus.SOLD, soldPrice: auction.currentBid, teamId: winnerId } : p
      ));
      setTeams(prev => prev.map(t => 
        t.id === winnerId ? { ...t, remainingBudget: t.remainingBudget - auction.currentBid } : t
      ));
    }

    setAuction({ currentPlayerId: null, currentBid: 0, biddingTeamIds: [], isActive: false });
  };

  const handleTieLottery = () => {
    if (auction.biddingTeamIds.length < 2) return;
    const randomIndex = Math.floor(Math.random() * auction.biddingTeamIds.length);
    const winnerId = auction.biddingTeamIds[randomIndex];
    alert(`Lottery Result: ${teams.find(t => t.id === winnerId)?.name} wins the tie!`);
    setAuction(prev => ({
      ...prev,
      biddingTeamIds: [winnerId]
    }));
  };

  const addPlayer = (newPlayer: Omit<Player, 'id' | 'status' | 'basePrice'>) => {
    const player: Player = {
      ...newPlayer,
      id: crypto.randomUUID(),
      status: PlayerStatus.UNSOLD,
      basePrice: CATEGORY_BASE_PRICES[newPlayer.category as PlayerCategory] || 0,
      auctionRound: 1
    };
    setPlayers(prev => [...prev, player]);
  };

  const updatePlayer = (updatedPlayer: Player) => {
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? {
      ...updatedPlayer,
      basePrice: CATEGORY_BASE_PRICES[updatedPlayer.category] || p.basePrice
    } : p));
  };

  const updatePlayerPhoto = (playerId: string, photoUrl: string) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, photoUrl } : p));
  };

  const updateTeamLogo = (teamId: string, logoUrl: string) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, logoUrl } : t));
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} role={role} setRole={setRole}>
      {activeTab === 'auction' && (
        <AuctionDashboard 
          players={players} 
          teams={teams} 
          auction={auction} 
          role={role}
          onStartAuction={handleStartAuction}
          onIncreaseBid={handleIncreaseBid}
          onMatchBid={handleMatchBid}
          onFinalizeSale={handleFinalizeSale}
          onTieLottery={handleTieLottery}
        />
      )}
      {activeTab === 'players' && (
        <PlayerManagement 
          players={players} 
          onAddPlayer={addPlayer} 
          onUpdatePlayer={updatePlayer}
          onUpdatePhoto={updatePlayerPhoto}
          setPlayers={setPlayers}
          onClearAll={() => setPlayers([])}
          role={role}
        />
      )}
      {activeTab === 'teams' && (
        <TeamManagement 
          teams={teams} 
          setTeams={setTeams} 
          role={role} 
          onUpdateLogo={updateTeamLogo}
          onClearAll={() => setTeams([])}
        />
      )}
      {activeTab === 'reports' && (
        <Reports players={players} teams={teams} />
      )}
    </Layout>
  );
};

export default App;
