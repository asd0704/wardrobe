import mongoose, { Document, Schema, Types } from 'mongoose'

export interface IAuditLog extends Document {
  userId: Types.ObjectId
  action: string
  payload?: string
  timestamp: Date
  ipAddress?: string
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  payload: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: false
})

// Indexes for better performance
auditLogSchema.index({ userId: 1 })
auditLogSchema.index({ timestamp: -1 })

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema)