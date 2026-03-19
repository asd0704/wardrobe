import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IItem extends Document {
  userId: Types.ObjectId
  name: string
  filename: string
  objectUrl: string
  thumbnailUrl: string
  processedUrl?: string
  colors: string[]
  type: 'TOP' | 'BOTTOM' | 'DRESS' | 'OUTERWEAR' | 'SHOES' | 'ACCESSORY' | 'UNDERWEAR' | 'SWIMWEAR' | 'SPORTSWEAR'
  occasion: 'CASUAL' | 'WORK' | 'FORMAL' | 'PARTY' | 'SPORTS' | 'BEACH' | 'DATE_NIGHT' | 'TRAVEL'
  season: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER' | 'ALL_SEASON'
  laundryStatus: 'IN_WARDROBE' | 'IN_LAUNDRY' | 'CLEAN' | 'AWAY'
  usageCount: number
  isFavorite: boolean
  moderated: boolean
  moderationNotes?: string
  createdAt: Date
  updatedAt: Date
}

const itemSchema = new Schema<IItem>({
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
  filename: {
    type: String,
    required: true
  },
  objectUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  processedUrl: {
    type: String
  },
  colors: [{
    type: String,
    trim: true
  }],
  type: {
    type: String,
    enum: ['TOP', 'BOTTOM', 'DRESS', 'OUTERWEAR', 'SHOES', 'ACCESSORY', 'UNDERWEAR', 'SWIMWEAR', 'SPORTSWEAR'],
    required: true
  },
  occasion: {
    type: String,
    enum: ['CASUAL', 'WORK', 'FORMAL', 'PARTY', 'SPORTS', 'BEACH', 'DATE_NIGHT', 'TRAVEL'],
    default: 'CASUAL'
  },
  season: {
    type: String,
    enum: ['SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL_SEASON'],
    default: 'ALL_SEASON'
  },
  laundryStatus: {
    type: String,
    enum: ['IN_WARDROBE', 'IN_LAUNDRY', 'CLEAN', 'AWAY'],
    default: 'IN_WARDROBE'
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  moderated: {
    type: Boolean,
    default: false
  },
  moderationNotes: {
    type: String
  }
}, {
  timestamps: true
})

// Indexes for better performance
itemSchema.index({ userId: 1 })
itemSchema.index({ type: 1 })
itemSchema.index({ season: 1 })
itemSchema.index({ laundryStatus: 1 })
itemSchema.index({ isFavorite: 1 })

export const Item = mongoose.models.Item || mongoose.model<IItem>('Item', itemSchema)