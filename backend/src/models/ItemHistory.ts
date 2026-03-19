import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IItemHistory extends Document {
  itemId: Types.ObjectId
  action: 'CREATED' | 'WORN' | 'MARKED_LAUNDRY' | 'RETURNED' | 'EDITED' | 'FAVORITED' | 'UNFAVORITED' | 'DELETED'
  timestamp: Date
  performedBy: Types.ObjectId
  notes?: string
}

const itemHistorySchema = new Schema<IItemHistory>({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  action: {
    type: String,
    enum: ['CREATED', 'WORN', 'MARKED_LAUNDRY', 'RETURNED', 'EDITED', 'FAVORITED', 'UNFAVORITED', 'DELETED'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: false
})

// Indexes for better performance
itemHistorySchema.index({ itemId: 1 })
itemHistorySchema.index({ timestamp: -1 })

export const ItemHistory = mongoose.models.ItemHistory || mongoose.model<IItemHistory>('ItemHistory', itemHistorySchema)