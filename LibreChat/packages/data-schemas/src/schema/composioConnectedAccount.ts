import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComposioConnectedAccount extends Document {
  user: Types.ObjectId;
  service: string; // 'googlesheets', 'googledrive', 'googledocs', 'gmail', 'googlecalendar'
  connectedAccountId: string; // Composio's connected_account_id
  appName: string; // Composio app name used when creating the connection
  status: 'active' | 'expired' | 'error' | 'pending'; // Connection status
  metadata?: Record<string, any>; // Additional metadata from Composio
  createdAt: Date;
  updatedAt: Date;
}

const composioConnectedAccountSchema: Schema<IComposioConnectedAccount> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: String,
      required: true,
      enum: ['googlesheets', 'googledrive', 'googledocs', 'gmail', 'googlecalendar'],
    },
    connectedAccountId: {
      type: String,
      required: true,
    },
    appName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'expired', 'error', 'pending'],
      default: 'pending',
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient lookups
composioConnectedAccountSchema.index({ user: 1, service: 1 }, { unique: true });

// Index for cleanup operations
composioConnectedAccountSchema.index({ status: 1, updatedAt: 1 });

export default composioConnectedAccountSchema;