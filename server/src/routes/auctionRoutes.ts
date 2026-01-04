import { Router } from 'express';
import * as auctionController from '../controllers/auctionController';

const router = Router();

// GET /api/auction/state - Get current auction state
router.get('/state', auctionController.getAuctionState);

// GET /api/auction/full-state - Get full state (auction + players + teams)
router.get('/full-state', auctionController.getFullState);

// POST /api/auction/start - Start auction for a player
router.post('/start', auctionController.startAuction);

// POST /api/auction/bid - Place a bid
router.post('/bid', auctionController.placeBid);

// POST /api/auction/match - Match current bid
router.post('/match', auctionController.matchBid);

// POST /api/auction/lottery - Run tie-breaker lottery
router.post('/lottery', auctionController.runLottery);

// POST /api/auction/finalize - Finalize sale
router.post('/finalize', auctionController.finalizeSale);

// POST /api/auction/unsold - Mark player as unsold
router.post('/unsold', auctionController.markUnsold);

// POST /api/auction/reset - Reset auction state
router.post('/reset', auctionController.resetAuction);

export default router;
