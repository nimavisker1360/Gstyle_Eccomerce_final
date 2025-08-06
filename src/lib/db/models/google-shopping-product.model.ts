import { Document, Model, model, models, Schema } from "mongoose";

export interface IGoogleShoppingProduct extends Document {
  id: string;
  title: string;
  title_fa: string; // Persian translation of title
  price: string;
  link: string;
  thumbnail: string;
  source: string;
  category: string;
  createdAt: Date;
}

const googleShoppingProductSchema = new Schema<IGoogleShoppingProduct>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    title_fa: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for category and createdAt for efficient querying
googleShoppingProductSchema.index({ category: 1, createdAt: -1 });

const GoogleShoppingProduct =
  (models.GoogleShoppingProduct as Model<IGoogleShoppingProduct>) ||
  model<IGoogleShoppingProduct>(
    "GoogleShoppingProduct",
    googleShoppingProductSchema
  );

export default GoogleShoppingProduct;
