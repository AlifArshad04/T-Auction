import React, { useState } from 'react';
import { UserRole } from './types';
import { Layout } from './components/Layout';
import { AuctionDashboard } from './components/AuctionDashboard';
import { PlayerManagement } from './components/PlayerManagement';
import { TeamManagement } from './components/TeamManagement';
import { Reports } from './components/Reports';
import { useAuction } from './src/hooks/useAuction';

const ADMIN_PASSWORD = 'admin123'; // Change this to your desired password

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'auction' | 'players' | 'teams' | 'reports'>('auction');
  const [role, setRole] = useState<UserRole>(UserRole.VIEWER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setRole(UserRole.ADMIN);
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setRole(UserRole.VIEWER);
    setPassword('');
    setLoginError('');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-[#004a99]">Therap Football Auction</h1>
          <p className="text-center text-gray-600 mb-6">Enter admin password to access admin features</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin Password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004a99] focus:border-transparent"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm text-center">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-[#004a99] text-white py-2 px-4 rounded-md hover:bg-[#003a7a] transition-colors"
            >
              Login as Admin
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setRole(UserRole.VIEWER);
                setIsAuthenticated(true);
              }}
              className="text-[#004a99] hover:text-[#003a7a] underline"
            >
              Continue as Viewer
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      onLogout={handleLogout}
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
