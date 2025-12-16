import { Schema, model, Document, Types } from "mongoose";

export interface MovieDocument extends Document {
  title: string;
  genres: string[];
  cast: string[];
  director?: string;
  releaseYear?: number;
  plot?: string;
  trailerUrl?: string;
  posterUrl?: string;
  posterGridFSId?: Types.ObjectId;
  posterContentType?: string;
  rating?: number;
  metadata?: Record<string, unknown>;
  embeddingKeys: {
    title?: string;
    plot?: string;
    genre?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<MovieDocument>(
  {
    title: { type: String, required: true, trim: true },
    genres: { type: [String], default: [] },
    cast: { type: [String], default: [] },
    director: { type: String },
    releaseYear: { type: Number },
    plot: { type: String },
    trailerUrl: { type: String },
    posterUrl: { type: String },
    posterGridFSId: { type: Schema.Types.ObjectId },
    posterContentType: { type: String },
    rating: { type: Number },
    metadata: { type: Schema.Types.Mixed },
    embeddingKeys: {
      title: { type: String },
      plot: { type: String },
      genre: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        return ret;
      },
    },
  }
);

movieSchema.index({ title: "text", plot: "text" });
movieSchema.index({ genres: 1, releaseYear: -1 });

export const MovieModel = model<MovieDocument>("Movie", movieSchema);
