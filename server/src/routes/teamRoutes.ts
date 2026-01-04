import { Router } from 'express';
import multer from 'multer';
import * as teamController from '../controllers/teamController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/teams - Get all teams
router.get('/', teamController.getAllTeams);

// GET /api/teams/summary - Get teams summary
router.get('/summary', teamController.getTeamsSummary);

// GET /api/teams/:id - Get team by ID
router.get('/:id', teamController.getTeamById);

// GET /api/teams/:id/squad - Get team with squad
router.get('/:id/squad', teamController.getTeamWithSquad);

// POST /api/teams - Create a new team
router.post('/', teamController.createTeam);

// POST /api/teams/bulk - Bulk import teams
router.post('/bulk', teamController.bulkCreateTeams);

// POST /api/teams/reset-budgets - Reset all team budgets
router.post('/reset-budgets', teamController.resetAllBudgets);

// PUT /api/teams/:id - Update a team
router.put('/:id', teamController.updateTeam);

// DELETE /api/teams/:id - Delete a team
router.delete('/:id', teamController.deleteTeam);

// DELETE /api/teams - Delete all teams
router.delete('/', teamController.deleteAllTeams);

// POST /api/teams/:id/logo - Upload team logo
router.post('/:id/logo', upload.single('logo'), teamController.uploadTeamLogo);

export default router;
