const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000/api';

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  authHeader?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (authHeader) {
    defaultHeaders['Authorization'] = authHeader;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
}

// Player API
export const playerApi = {
  getAll: () => fetchApi<{ players: unknown[] }>('/players'),

  getById: (id: string) => fetchApi<{ player: unknown }>(`/players/${id}`),

  create: (data: {
    name: string;
    department: string;
    position: string;
    category: string;
    photoId?: string;
  }) =>
    fetchApi<{ player: unknown }>('/players', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  bulkImport: (players: unknown[], authHeader?: string) =>
    fetchApi<{ created: number; failed: number; imagesFound: number }>('/players/bulk', {
      method: 'POST',
      body: JSON.stringify({ players })
    }, authHeader),

  update: (id: string, data: Partial<{ name: string; department: string; position: string; category: string; photoId: string }>) =>
    fetchApi<{ player: unknown }>(`/players/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/players/${id}`, {
      method: 'DELETE'
    }),

  deleteAll: (authHeader?: string) =>
    fetchApi<{ deleted: number }>('/players', {
      method: 'DELETE'
    }, authHeader),

  uploadPhoto: (id: string, photoData: string) =>
    fetchApi<{ player: unknown }>(`/players/${id}/photo`, {
      method: 'POST',
      body: JSON.stringify({ photoUrl: photoData })
    }),

  bulkUploadPhotos: async (files: FileList, authHeader?: string) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('photos', file);
    });

    const headers: HeadersInit = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${API_BASE_URL}/players/photos/bulk`, {
      method: 'POST',
      body: formData,
      headers
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }
};

// Team API
export const teamApi = {
  getAll: () => fetchApi<{ teams: unknown[] }>('/teams'),

  getById: (id: string) => fetchApi<{ team: unknown }>(`/teams/${id}`),

  getWithSquad: (id: string) =>
    fetchApi<{ team: unknown; squad: unknown[]; spent: number }>(`/teams/${id}/squad`),

  getSummary: () => fetchApi<{ summary: unknown[] }>('/teams/summary'),

  create: (data: { name: string; owner: string; initialBudget?: number }) =>
    fetchApi<{ team: unknown }>('/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  bulkImport: (teams: unknown[], authHeader?: string) =>
    fetchApi<{ created: number; failed: number }>('/teams/bulk', {
      method: 'POST',
      body: JSON.stringify({ teams })
    }, authHeader),

  update: (id: string, data: Partial<{ name: string; owner: string }>) =>
    fetchApi<{ team: unknown }>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/teams/${id}`, {
      method: 'DELETE'
    }),

  deleteAll: (authHeader?: string) =>
    fetchApi<{ deleted: number }>('/teams', {
      method: 'DELETE'
    }, authHeader),

  uploadLogo: (id: string, logoData: string) =>
    fetchApi<{ team: unknown }>(`/teams/${id}/logo`, {
      method: 'POST',
      body: JSON.stringify({ logoUrl: logoData })
    }),

  resetBudgets: (authHeader?: string) =>
    fetchApi<{ success: boolean }>('/teams/reset-budgets', {
      method: 'POST'
    }, authHeader)
};

// Auction API
export const auctionApi = {
  getState: () => fetchApi<{ auctionState: unknown; player: unknown; biddingTeams: unknown[] }>('/auction/state'),

  getFullState: () =>
    fetchApi<{ auctionState: unknown; players: unknown[]; teams: unknown[] }>('/auction/full-state'),

  start: (playerId: string) =>
    fetchApi<{ auctionState: unknown; player: unknown }>('/auction/start', {
      method: 'POST',
      body: JSON.stringify({ playerId })
    }),

  placeBid: (teamId: string, customAmount?: number) =>
    fetchApi<{ auctionState: unknown }>('/auction/bid', {
      method: 'POST',
      body: JSON.stringify({ teamId, customAmount })
    }),

  matchBid: (teamId: string) =>
    fetchApi<{ auctionState: unknown }>('/auction/match', {
      method: 'POST',
      body: JSON.stringify({ teamId })
    }),

  runLottery: () =>
    fetchApi<{ auctionState: unknown; winningTeam: unknown }>('/auction/lottery', {
      method: 'POST'
    }),

  finalize: () =>
    fetchApi<{ auctionState: unknown; player: unknown; team: unknown }>('/auction/finalize', {
      method: 'POST'
    }),

  markUnsold: () =>
    fetchApi<{ auctionState: unknown; player: unknown }>('/auction/unsold', {
      method: 'POST'
    }),

  forceSell: (playerId: string, teamId: string, amount: number, authHeader?: string) =>
    fetchApi<{ auctionState: unknown; player: unknown; team: unknown }>('/auction/force-sell', {
      method: 'POST',
      body: JSON.stringify({ playerId, teamId, amount })
    }, authHeader),

  reset: (authHeader?: string) =>
    fetchApi<{ auctionState: unknown }>('/auction/reset', {
      method: 'POST'
    }, authHeader)
};
