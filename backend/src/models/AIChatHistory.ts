import { Schema, model, Document, Types } from 'mongoose';

export interface IAIChatHistory extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    dataFetched?: {
      type: string;
      employeeId?: string;
      [key: string]: any;
    };
  }>;
  context: 'hr_support' | 'recruitment' | 'onboarding' | 'general';
  resolved: boolean;
  createdAt: Date;
}

const AIChatHistorySchema = new Schema<IAIChatHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        dataFetched: {
          type: { type: String },
          employeeId: { type: String },
          metadata: { type: Schema.Types.Mixed },
        },
      },
    ],
    context: {
      type: String,
      enum: ['hr_support', 'recruitment', 'onboarding', 'general'],
      default: 'general',
    },
    resolved: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AIChatHistory = model<IAIChatHistory>('AIChatHistory', AIChatHistorySchema);
