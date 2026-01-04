import { Team, ITeam } from '../models/Team';
import { Player, PlayerStatus } from '../models/Player';
import { DEFAULT_TEAM_BUDGET } from '../utils/constants';

export interface CreateTeamInput {
  name: string;
  owner: string;
  initialBudget?: number;
  logoUrl?: string;
}

export interface UpdateTeamInput {
  name?: string;
  owner?: string;
  logoUrl?: string;
}

export interface TeamWithSquad extends ITeam {
  squad: typeof Player[];
  spent: number;
}

class TeamService {
  async getAll(): Promise<ITeam[]> {
    return Team.find().sort({ name: 1 });
  }

  async getById(id: string): Promise<ITeam | null> {
    return Team.findById(id);
  }

  async getWithSquad(id: string) {
    const team = await Team.findById(id);
    if (!team) return null;

    const squad = await Player.find({ teamId: id, status: PlayerStatus.SOLD }).sort({
      category: 1,
      name: 1
    });

    const spent = team.initialBudget - team.remainingBudget;

    return { team, squad, spent };
  }

  async create(input: CreateTeamInput): Promise<ITeam> {
    const budget = input.initialBudget || DEFAULT_TEAM_BUDGET;

    const team = new Team({
      name: input.name,
      owner: input.owner,
      initialBudget: budget,
      remainingBudget: budget,
      logoUrl: input.logoUrl
    });

    return team.save();
  }

  async bulkCreate(inputs: CreateTeamInput[]): Promise<{ created: number; failed: number }> {
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

  async update(id: string, input: UpdateTeamInput): Promise<ITeam | null> {
    return Team.findByIdAndUpdate(id, input, { new: true });
  }

  async updateLogo(id: string, logoUrl: string): Promise<ITeam | null> {
    return Team.findByIdAndUpdate(id, { logoUrl }, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    // First, unassign any players from this team
    await Player.updateMany(
      { teamId: id },
      { teamId: null, status: PlayerStatus.UNSOLD, soldPrice: null }
    );

    const result = await Team.findByIdAndDelete(id);
    return !!result;
  }

  async deleteAll(): Promise<number> {
    // Reset all players first
    await Player.updateMany(
      { status: PlayerStatus.SOLD },
      { teamId: null, status: PlayerStatus.UNSOLD, soldPrice: null, auctionRound: 1 }
    );

    const result = await Team.deleteMany({});
    return result.deletedCount;
  }

  async resetAllBudgets(): Promise<void> {
    const teams = await Team.find();
    for (const team of teams) {
      team.remainingBudget = team.initialBudget;
      await team.save();
    }

    // Also reset player assignments
    await Player.updateMany(
      { status: PlayerStatus.SOLD },
      { teamId: null, status: PlayerStatus.UNSOLD, soldPrice: null, auctionRound: 1 }
    );
  }

  async getSummary() {
    const teams = await this.getAll();
    const players = await Player.find({ status: PlayerStatus.SOLD });

    return teams.map((team) => {
      const teamPlayers = players.filter((p) => p.teamId?.toString() === team._id.toString());
      const spent = team.initialBudget - team.remainingBudget;

      return {
        team,
        squadSize: teamPlayers.length,
        spent,
        remaining: team.remainingBudget
      };
    });
  }
}

export const teamService = new TeamService();
