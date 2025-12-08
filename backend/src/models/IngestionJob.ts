import { Schema, model, Document, Types } from 'mongoose';

export interface IngestionJobDocument extends Document {
  movieId: Types.ObjectId;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ingestionJobSchema = new Schema<IngestionJobDocument>(
  {
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

ingestionJobSchema.index({ movieId: 1, status: 1 });

export const IngestionJobModel = model<IngestionJobDocument>('IngestionJob', ingestionJobSchema);

