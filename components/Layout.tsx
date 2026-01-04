
import React from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  isConnected?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, role, setRole, isConnected = true }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-therap text-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-therap font-bold">T</div>
          <h1 className="text-xl font-bold tracking-tight">Therap Football Auction</h1>
          <div className={`flex items-center space-x-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${isConnected ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span>{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
        
        <nav className="hidden md:flex space-x-6 font-medium">
          <button 
            onClick={() => setActiveTab('auction')}
            className={`hover:text-blue-200 transition ${activeTab === 'auction' ? 'border-b-2 border-white' : ''}`}
          >
            Auction Floor
          </button>
          <button 
            onClick={() => setActiveTab('players')}
            className={`hover:text-blue-200 transition ${activeTab === 'players' ? 'border-b-2 border-white' : ''}`}
          >
            Players
          </button>
          <button 
            onClick={() => setActiveTab('teams')}
            className={`hover:text-blue-200 transition ${activeTab === 'teams' ? 'border-b-2 border-white' : ''}`}
          >
            Teams
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`hover:text-blue-200 transition ${activeTab === 'reports' ? 'border-b-2 border-white' : ''}`}
          >
            Reports
          </button>
        </nav>

        <div className="flex items-center space-x-4">
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-blue-800 text-sm border-none rounded px-2 py-1 outline-none"
          >
            <option value={UserRole.ADMIN}>Admin Mode</option>
            <option value={UserRole.VIEWER}>Viewer Mode</option>
          </select>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>

      <footer className="bg-slate-100 p-4 text-center text-slate-500 text-xs border-t">
        &copy; {new Date().getFullYear()} Therap Football Tournament. All Rights Reserved.
      </footer>
    </div>
  );
};
