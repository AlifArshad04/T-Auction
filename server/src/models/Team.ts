import mongoose, { Schema, Document } from 'mongoose';
import { DEFAULT_TEAM_BUDGET } from '../utils/constants';

export interface ITeam extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  owner: string;
  initialBudget: number;
  remainingBudget: number;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    initialBudget: { type: Number, required: true, default: DEFAULT_TEAM_BUDGET },
    remainingBudget: { type: Number, required: true, default: DEFAULT_TEAM_BUDGET },
    logoUrl: { type: String }
  },
  { timestamps: true }
);

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
