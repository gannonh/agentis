import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComposioConnectedAccount extends Document {
  user: Types.ObjectId;
  service: string; // 'googlesheets', 'googledrive', 'googledocs', 'gmail', 'googlecalendar'
  connectedAccountId: string; // Composio's connected_account_id
  connectionStatus: 'PENDING' | 'INITIATED' | 'ACTIVE' | 'ERROR'; // Direct Composio status
  redirectUrl?: string; // OAuth redirect URL (only during flow)
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
    connectionStatus: {
      type: String,
      required: true,
      enum: ['PENDING', 'INITIATED', 'ACTIVE', 'ERROR'],
      default: 'PENDING',
    },
    redirectUrl: {
      type: String,
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
composioConnectedAccountSchema.index({ connectionStatus: 1, updatedAt: 1 });

export default composioConnectedAccountSchema;