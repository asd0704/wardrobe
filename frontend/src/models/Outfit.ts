import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IOutfit extends Document {
  userId: Types.ObjectId
  name: string
  description?: string
  thumbnailUrl?: string
  isPublic: boolean
  items: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const outfitSchema = new Schema<IOutfit>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnailUrl: {
    type: String
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  items: [{
    type: Schema.Types.ObjectId,
    ref: 'Item'
  }]
}, {
  timestamps: true
})

// Indexes for better performance
outfitSchema.index({ userId: 1 })
outfitSchema.index({ isPublic: 1 })

export const Outfit = mongoose.models.Outfit || mongoose.model<IOutfit>('Outfit', outfitSchema)