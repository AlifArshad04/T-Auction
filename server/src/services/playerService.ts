import { Player, IPlayer, PlayerStatus, PlayerCategory } from '../models/Player';
import { CATEGORY_BASE_PRICES } from '../utils/constants';

export interface CreatePlayerInput {
  photoId?: string;
  name: string;
  department: string;
  position: string;
  category: PlayerCategory;
  photoUrl?: string;
}

export interface UpdatePlayerInput {
  photoId?: string;
  name?: string;
  department?: string;
  position?: string;
  category?: PlayerCategory;
  photoUrl?: string;
}

class PlayerService {
  async getAll(): Promise<IPlayer[]> {
    return Player.find().sort({ category: 1, name: 1 });
  }

  async getById(id: string): Promise<IPlayer | null> {
    return Player.findById(id);
  }

  async getByStatus(status: PlayerStatus): Promise<IPlayer[]> {
    return Player.find({ status }).sort({ category: 1, name: 1 });
  }

  async getByTeam(teamId: string): Promise<IPlayer[]> {
    return Player.find({ teamId, status: PlayerStatus.SOLD }).sort({ category: 1, name: 1 });
  }

  async create(input: CreatePlayerInput): Promise<IPlayer> {
    const basePrice = CATEGORY_BASE_PRICES[input.category];

    const player = new Player({
      ...input,
      originalCategory: input.category,
      basePrice,
      status: PlayerStatus.UNSOLD,
      auctionRound: 1
    });

    return player.save();
  }

  async bulkCreate(inputs: CreatePlayerInput[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;

    for (const input of inputs) {
      try {
        await this.create(input);
        created++;
      } catch {
        failed++;
      }
    }

    return { created, failed };
  }

  async update(id: string, input: UpdatePlayerInput): Promise<IPlayer | null> {
    const updateData: Partial<IPlayer> = { ...input };

    // If category changed, update base price
    if (input.category) {
      updateData.basePrice = CATEGORY_BASE_PRICES[input.category];
    }

    return Player.findByIdAndUpdate(id, updateData, { new: true });
  }

  async updatePhoto(id: string, photoUrl: string): Promise<IPlayer | null> {
    return Player.findByIdAndUpdate(id, { photoUrl }, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await Player.findByIdAndDelete(id);
    return !!result;
  }

  async deleteAll(): Promise<number> {
    const result = await Player.deleteMany({});
    return result.deletedCount;
  }

  async resetAllPlayers(): Promise<void> {
    await Player.updateMany(
      {},
      {
        status: PlayerStatus.UNSOLD,
        soldPrice: null,
        teamId: null,
        auctionRound: 1
      }
    );
  }

  async getByPhotoId(photoId: string): Promise<IPlayer | null> {
    return Player.findOne({ photoId });
  }

  async bulkUpdatePhotos(
    updates: { photoId: string; photoUrl: string }[]
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const { photoId, photoUrl } of updates) {
      try {
        const result = await Player.findOneAndUpdate({ photoId }, { photoUrl });
        if (result) {
          updated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { updated, failed };
  }
}

export const playerService = new PlayerService();
