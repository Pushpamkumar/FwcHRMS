import { Schema, model, Document, Types } from 'mongoose';

export interface IJobPosting extends Document {
  title: string;
  departmentId: Types.ObjectId;
  postedBy: Types.ObjectId;
  description: string;
  requirements: {
    minExperience: number;
    maxExperience: number;
    requiredSkills: string[];
    preferredSkills?: string[];
    education: string;
    location: string;
  };
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  positions: number;
  applicationDeadline: Date;
  status: 'draft' | 'active' | 'paused' | 'closed' | 'filled';
  applicationsCount: number;
  shortlistedCount: number;
  pipeline: {
    screening: number;
    shortlisted: number;
    phone_screen: number;
    technical_interview: number;
    hr_interview: number;
    offer: number;
    hired: number;
  };
  aiKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
}

const JobPostingSchema = new Schema<IJobPosting>(
  {
    title: { type: String, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    requirements: {
      minExperience: { type: Number, required: true },
      maxExperience: { type: Number, required: true },
      requiredSkills: [{ type: String, required: true }],
      preferredSkills: [{ type: String }],
      education: { type: String, required: true },
      location: { type: String, required: true },
    },
    salaryRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
    },
    positions: { type: Number, default: 1 },
    applicationDeadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'closed', 'filled'],
      default: 'draft',
    },
    applicationsCount: { type: Number, default: 0 },
    shortlistedCount: { type: Number, default: 0 },
    pipeline: {
      screening: { type: Number, default: 0 },
      shortlisted: { type: Number, default: 0 },
      phone_screen: { type: Number, default: 0 },
      technical_interview: { type: Number, default: 0 },
      hr_interview: { type: Number, default: 0 },
      offer: { type: Number, default: 0 },
      hired: { type: Number, default: 0 },
    },
    aiKeywords: [{ type: String }],
    closedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const JobPosting = model<IJobPosting>('JobPosting', JobPostingSchema);
