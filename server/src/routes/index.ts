import { Router } from 'express';
import playerRoutes from './playerRoutes';
import teamRoutes from './teamRoutes';
import auctionRoutes from './auctionRoutes';

const router = Router();

router.use('/players', playerRoutes);
router.use('/teams', teamRoutes);
router.use('/auction', auctionRoutes);

export default router;
