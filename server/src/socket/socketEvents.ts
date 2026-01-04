// Client -> Server Events
export const CLIENT_EVENTS = {
  // Connection
  JOIN_AUCTION: 'client:join_auction',

  // Admin actions
  START_AUCTION: 'client:start_auction',
  PLACE_BID: 'client:place_bid',
  MATCH_BID: 'client:match_bid',
  RUN_LOTTERY: 'client:run_lottery',
  FINALIZE_SALE: 'client:finalize_sale',
  MARK_UNSOLD: 'client:mark_unsold',
  FORCE_SELL: 'client:force_sell',
  RESET_AUCTION: 'client:reset_auction',

  // CRUD operations that need real-time sync
  PLAYER_CREATED: 'client:player_created',
  PLAYER_UPDATED: 'client:player_updated',
  PLAYER_DELETED: 'client:player_deleted',
  PLAYERS_IMPORTED: 'client:players_imported',
  PLAYERS_CLEARED: 'client:players_cleared',
  TEAM_CREATED: 'client:team_created',
  TEAM_UPDATED: 'client:team_updated',
  TEAM_DELETED: 'client:team_deleted',
  TEAMS_IMPORTED: 'client:teams_imported',
  TEAMS_CLEARED: 'client:teams_cleared',

  // Request full state sync
  REQUEST_SYNC: 'client:request_sync'
} as const;

// Server -> Client Events
export const SERVER_EVENTS = {
  // Connection
  CONNECTED: 'server:connected',

  // Full state sync
  FULL_STATE: 'server:full_state',

  // Auction state updates
  AUCTION_STARTED: 'server:auction_started',
  BID_PLACED: 'server:bid_placed',
  BID_MATCHED: 'server:bid_matched',
  LOTTERY_RESULT: 'server:lottery_result',
  SALE_FINALIZED: 'server:sale_finalized',
  AUCTION_RESET: 'server:auction_reset',

  // Entity updates
  PLAYER_UPDATE: 'server:player_update',
  PLAYERS_BULK_UPDATE: 'server:players_bulk_update',
  TEAM_UPDATE: 'server:team_update',
  TEAMS_BULK_UPDATE: 'server:teams_bulk_update',

  // Errors
  ERROR: 'server:error'
} as const;

export type ClientEventType = (typeof CLIENT_EVENTS)[keyof typeof CLIENT_EVENTS];
export type ServerEventType = (typeof SERVER_EVENTS)[keyof typeof SERVER_EVENTS];
