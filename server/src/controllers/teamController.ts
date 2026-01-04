import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { teamService, CreateTeamInput } from '../services/teamService';
import { uploadImage, uploadBase64Image } from '../services/uploadService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { SERVER_EVENTS } from '../socket/socketEvents';

export const getAllTeams = asyncHandler(async (_req: Request, res: Response) => {
  const teams = await teamService.getAll();
  res.json({ success: true, teams });
});

export const getTeamById = asyncHandler(async (req: Request, res: Response) => {
  const team = await teamService.getById(req.params.id);
  if (!team) {
    throw createError('Team not found', 404);
  }
  res.json({ success: true, team });
});

export const getTeamWithSquad = asyncHandler(async (req: Request, res: Response) => {
  const result = await teamService.getWithSquad(req.params.id);
  if (!result) {
    throw createError('Team not found', 404);
  }
  res.json({ success: true, ...result });
});

export const createTeam = asyncHandler(async (req: Request, res: Response) => {
  const { name, owner, initialBudget } = req.body;

  if (!name || !owner) {
    throw createError('Name and owner are required', 400);
  }

  const input: CreateTeamInput = {
    name,
    owner,
    initialBudget
  };

  const team = await teamService.create(input);

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.TEAM_UPDATE, { team, action: 'created' });

  res.status(201).json({ success: true, team });
});

export const bulkCreateTeams = asyncHandler(async (req: Request, res: Response) => {
  const { teams } = req.body;

  if (!Array.isArray(teams) || teams.length === 0) {
    throw createError('Teams array is required', 400);
  }

  const inputs: CreateTeamInput[] = teams.map((t) => ({
    name: t.name,
    owner: t.owner,
    initialBudget: t.initialBudget
  }));

  const result = await teamService.bulkCreate(inputs);

  // Fetch all teams and broadcast
  const allTeams = await teamService.getAll();
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.TEAMS_BULK_UPDATE, { teams: allTeams, action: 'imported' });

  res.status(201).json({ success: true, ...result });
});

export const updateTeam = asyncHandler(async (req: Request, res: Response) => {
  const { name, owner } = req.body;

  const updateData: Partial<CreateTeamInput> = {};
  if (name) updateData.name = name;
  if (owner) updateData.owner = owner;

  const team = await teamService.update(req.params.id, updateData);
  if (!team) {
    throw createError('Team not found', 404);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.TEAM_UPDATE, { team, action: 'updated' });

  res.json({ success: true, team });
});

export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const success = await teamService.delete(req.params.id);
  if (!success) {
    throw createError('Team not found', 404);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.TEAM_UPDATE, { teamId: req.params.id, action: 'deleted' });

  res.json({ success: true });
});

export const deleteAllTeams = asyncHandler(async (req: Request, res: Response) => {
  const count = await teamService.deleteAll();

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.TEAMS_BULK_UPDATE, { teams: [], action: 'cleared' });

  res.json({ success: true, deleted: count });
});

export const uploadTeamLogo = asyncHandler(async (req: Request, res: Response) => {
  const teamId = req.params.id;

  const team = await teamService.getById(teamId);
  if (!team) {
    throw createError('Team not found', 404);
  }

  // Handle multipart file upload
  if (req.file) {
    const result = await uploadImage(req.file.buffer, 'teams', teamId);

    if (!result.success) {
      throw createError(result.error || 'Upload failed', 500);
    }

    const updatedTeam = await teamService.updateLogo(teamId, result.url!);

    const io: Server = req.app.get('io');
    io.emit(SERVER_EVENTS.TEAM_UPDATE, { team: updatedTeam, action: 'updated' });

    res.json({ success: true, team: updatedTeam });
  }
  // Handle base64 upload
  else if (req.body.logoUrl) {
    const result = await uploadBase64Image(req.body.logoUrl, 'teams', teamId);

    if (!result.success) {
      throw createError(result.error || 'Upload failed', 500);
    }

    const updatedTeam = await teamService.updateLogo(teamId, result.url!);

    const io: Server = req.app.get('io');
    io.emit(SERVER_EVENTS.TEAM_UPDATE, { team: updatedTeam, action: 'updated' });

    res.json({ success: true, team: updatedTeam });
  } else {
    throw createError('No logo provided', 400);
  }
});

export const getTeamsSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await teamService.getSummary();
  res.json({ success: true, summary });
});

export const resetAllBudgets = asyncHandler(async (req: Request, res: Response) => {
  await teamService.resetAllBudgets();

  // Fetch updated data and broadcast
  const allTeams = await teamService.getAll();
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.TEAMS_BULK_UPDATE, { teams: allTeams, action: 'reset' });

  res.json({ success: true, message: 'All budgets reset' });
});
