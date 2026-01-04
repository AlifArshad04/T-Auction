import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { playerService, CreatePlayerInput } from '../services/playerService';
import { uploadImage, uploadBase64Image } from '../services/uploadService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { SERVER_EVENTS } from '../socket/socketEvents';
import { PlayerCategory } from '../models/Player';

export const getAllPlayers = asyncHandler(async (_req: Request, res: Response) => {
  const players = await playerService.getAll();
  res.json({ success: true, players });
});

export const getPlayerById = asyncHandler(async (req: Request, res: Response) => {
  const player = await playerService.getById(req.params.id);
  if (!player) {
    throw createError('Player not found', 404);
  }
  res.json({ success: true, player });
});

export const createPlayer = asyncHandler(async (req: Request, res: Response) => {
  const { photoId, name, department, position, category } = req.body;

  if (!name || !department || !position || !category) {
    throw createError('Missing required fields', 400);
  }

  if (!['A', 'B', 'C'].includes(category)) {
    throw createError('Invalid category. Must be A, B, or C', 400);
  }

  const input: CreatePlayerInput = {
    photoId,
    name,
    department,
    position,
    category: category as PlayerCategory
  };

  const player = await playerService.create(input);

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.PLAYER_UPDATE, { player, action: 'created' });

  res.status(201).json({ success: true, player });
});

export const bulkCreatePlayers = asyncHandler(async (req: Request, res: Response) => {
  const { players } = req.body;

  if (!Array.isArray(players) || players.length === 0) {
    throw createError('Players array is required', 400);
  }

  const inputs: CreatePlayerInput[] = players.map((p) => ({
    photoId: p.photoId,
    name: p.name,
    department: p.department,
    position: p.position,
    category: p.category as PlayerCategory
  }));

  const result = await playerService.bulkCreate(inputs);

  // Fetch all players and broadcast
  const allPlayers = await playerService.getAll();
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.PLAYERS_BULK_UPDATE, { players: allPlayers, action: 'imported' });

  res.status(201).json({ success: true, ...result });
});

export const updatePlayer = asyncHandler(async (req: Request, res: Response) => {
  const { photoId, name, department, position, category } = req.body;

  const updateData: Partial<CreatePlayerInput> = {};
  if (photoId !== undefined) updateData.photoId = photoId;
  if (name) updateData.name = name;
  if (department) updateData.department = department;
  if (position) updateData.position = position;
  if (category) {
    if (!['A', 'B', 'C'].includes(category)) {
      throw createError('Invalid category', 400);
    }
    updateData.category = category as PlayerCategory;
  }

  const player = await playerService.update(req.params.id, updateData);
  if (!player) {
    throw createError('Player not found', 404);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.PLAYER_UPDATE, { player, action: 'updated' });

  res.json({ success: true, player });
});

export const deletePlayer = asyncHandler(async (req: Request, res: Response) => {
  const success = await playerService.delete(req.params.id);
  if (!success) {
    throw createError('Player not found', 404);
  }

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.PLAYER_UPDATE, { playerId: req.params.id, action: 'deleted' });

  res.json({ success: true });
});

export const deleteAllPlayers = asyncHandler(async (req: Request, res: Response) => {
  const count = await playerService.deleteAll();

  // Broadcast to all clients
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.PLAYERS_BULK_UPDATE, { players: [], action: 'cleared' });

  res.json({ success: true, deleted: count });
});

export const uploadPlayerPhoto = asyncHandler(async (req: Request, res: Response) => {
  const playerId = req.params.id;

  const player = await playerService.getById(playerId);
  if (!player) {
    throw createError('Player not found', 404);
  }

  // Handle multipart file upload
  if (req.file) {
    const result = await uploadImage(req.file.buffer, 'players', playerId);

    if (!result.success) {
      throw createError(result.error || 'Upload failed', 500);
    }

    const updatedPlayer = await playerService.updatePhoto(playerId, result.url!);

    const io: Server = req.app.get('io');
    io.emit(SERVER_EVENTS.PLAYER_UPDATE, { player: updatedPlayer, action: 'updated' });

    res.json({ success: true, player: updatedPlayer });
  }
  // Handle base64 upload
  else if (req.body.photoUrl) {
    const result = await uploadBase64Image(req.body.photoUrl, 'players', playerId);

    if (!result.success) {
      throw createError(result.error || 'Upload failed', 500);
    }

    const updatedPlayer = await playerService.updatePhoto(playerId, result.url!);

    const io: Server = req.app.get('io');
    io.emit(SERVER_EVENTS.PLAYER_UPDATE, { player: updatedPlayer, action: 'updated' });

    res.json({ success: true, player: updatedPlayer });
  } else {
    throw createError('No photo provided', 400);
  }
});

export const bulkUploadPhotos = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw createError('No files provided', 400);
  }

  let updated = 0;
  let failed = 0;

  for (const file of files) {
    // Extract photoId from filename (remove extension)
    const photoId = file.originalname.replace(/\.[^/.]+$/, '');

    const player = await playerService.getByPhotoId(photoId);
    if (!player) {
      failed++;
      continue;
    }

    const result = await uploadImage(file.buffer, 'players', player._id.toString());
    if (result.success && result.url) {
      await playerService.updatePhoto(player._id.toString(), result.url);
      updated++;
    } else {
      failed++;
    }
  }

  // Broadcast updated players
  const allPlayers = await playerService.getAll();
  const io: Server = req.app.get('io');
  io.emit(SERVER_EVENTS.PLAYERS_BULK_UPDATE, { players: allPlayers, action: 'updated' });

  res.json({ success: true, updated, failed });
});
