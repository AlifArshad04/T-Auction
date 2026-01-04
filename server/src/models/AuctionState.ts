import mongoose, { Schema, Document } from 'mongoose';

export interface IAuctionState extends Document {
  _id: mongoose.Types.ObjectId;
  currentPlayerId: mongoose.Types.ObjectId | null;
  currentBid: number;
  biddingTeamIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  updatedAt: Date;
}

const AuctionStateSchema = new Schema<IAuctionState>(
  {
    currentPlayerId: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    currentBid: { type: Number, default: 0 },
    biddingTeamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    isActive: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const AuctionState = mongoose.model<IAuctionState>('AuctionState', AuctionStateSchema);

// Helper to get or create singleton auction state
export async function getAuctionState(): Promise<IAuctionState> {
  let state = await AuctionState.findOne();
  if (!state) {
    state = await AuctionState.create({
      currentPlayerId: null,
      currentBid: 0,
      biddingTeamIds: [],
      isActive: false
    });
  }
  return state;
}
