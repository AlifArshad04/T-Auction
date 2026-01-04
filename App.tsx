import React, { useState } from 'react';
import { UserRole } from './types';
import { Layout } from './components/Layout';
import { AuctionDashboard } from './components/AuctionDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { TeamManagement } from './components/TeamManagement';
import { Reports } from './components/Reports';
import { useAuction } from './src/hooks/useAuction';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auction' | 'players' | 'teams' | 'reports'>('auction');
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);

  const {
    players,
    teams,
    auction,
    isConnected,
    isLoading,
    error,
    startAuction,
    placeBid,
    matchBid,
    runLottery,
    finalizeSale,
    markUnsold,
    addPlayer,
    updatePlayer,
    updatePlayerPhoto,
    importPlayers,
    clearAllPlayers,
    addTeam,
    updateTeam,
    updateTeamLogo,
    importTeams,
    clearAllTeams,
    setPlayers,
    setTeams
  } = useAuction();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004a99] mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to server...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      role={role}
      setRole={setRole}
      isConnected={isConnected}
    >
      {activeTab === 'auction' && (
        <AuctionDashboard
          players={players}
          teams={teams}
          auction={auction}
          role={role}
          onStartAuction={startAuction}
          onIncreaseBid={placeBid}
          onMatchBid={matchBid}
          onFinalizeSale={finalizeSale}
          onMarkUnsold={markUnsold}
          onTieLottery={runLottery}
        />
      )}
      {activeTab === 'players' && (
        <PlayerManagement
          players={players}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onUpdatePhoto={updatePlayerPhoto}
          onImportPlayers={importPlayers}
          setPlayers={setPlayers}
          onClearAll={clearAllPlayers}
          role={role}
        />
      )}
      {activeTab === 'teams' && (
        <TeamManagement
          teams={teams}
          setTeams={setTeams}
          onAddTeam={addTeam}
          onUpdateTeam={updateTeam}
          onImportTeams={importTeams}
          role={role}
          onUpdateLogo={updateTeamLogo}
          onClearAll={clearAllTeams}
        />
      )}
      {activeTab === 'reports' && (
        <Reports players={players} teams={teams} />
      )}
    </Layout>
  );
};

export default App;
