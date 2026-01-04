import { Router } from 'express';
import multer from 'multer';
import * as playerController from '../controllers/playerController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/players - Get all players
router.get('/', playerController.getAllPlayers);

// GET /api/players/:id - Get player by ID
router.get('/:id', playerController.getPlayerById);

// POST /api/players - Create a new player
router.post('/', playerController.createPlayer);

// POST /api/players/bulk - Bulk import players
router.post('/bulk', playerController.bulkCreatePlayers);

// PUT /api/players/:id - Update a player
router.put('/:id', playerController.updatePlayer);

// DELETE /api/players/:id - Delete a player
router.delete('/:id', playerController.deletePlayer);

// DELETE /api/players - Delete all players
router.delete('/', playerController.deleteAllPlayers);

// POST /api/players/:id/photo - Upload player photo
router.post('/:id/photo', playerController.uploadPlayerPhoto);

// POST /api/players/photos/bulk - Bulk upload photos
router.post('/photos/bulk', upload.array('photos', 100), playerController.bulkUploadPhotos);

export default router;
