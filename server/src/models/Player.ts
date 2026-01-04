import mongoose, { Schema, Document } from 'mongoose';

export enum PlayerStatus {
  UNSOLD = 'UNSOLD',
  SOLD = 'SOLD',
  DISTRIBUTED = 'DISTRIBUTED'
}

export enum PlayerCategory {
  A = 'A',
  B = 'B',
  C = 'C'
}

export interface IPlayer extends Document {
  _id: mongoose.Types.ObjectId;
  photoId?: string;
  name: string;
  department: string;
  position: string;
  category: PlayerCategory;
  originalCategory: PlayerCategory;
  basePrice: number;
  status: PlayerStatus;
  photoUrl?: string;
  soldPrice?: number;
  teamId?: mongoose.Types.ObjectId;
  auctionRound: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    photoId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(PlayerCategory),
      required: true
    },
    originalCategory: {
      type: String,
      enum: Object.values(PlayerCategory)
    },
    basePrice: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(PlayerStatus),
      default: PlayerStatus.UNSOLD
    },
    photoUrl: { type: String },
    soldPrice: { type: Number },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    auctionRound: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// Indexes for common queries
PlayerSchema.index({ status: 1 });
PlayerSchema.index({ category: 1 });
PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ photoId: 1 });

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);
