import { Schema, model, Document, Types } from 'mongoose';

export interface IResume extends Document {
  jobPostingId: Types.ObjectId;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  resumeUrl: string;
  resumeText?: string;
  aiScreening?: {
    overallScore: number;
    status: 'pending' | 'shortlisted' | 'rejected' | 'review';
    processedAt?: Date;
    scores?: {
      skillsMatch: number;
      experienceMatch: number;
      educationMatch: number;
      keywordsMatch: number;
    };
    matchedSkills: string[];
    missingSkills: string[];
    extractedInfo?: {
      totalExperience?: number;
      currentCompany?: string;
      currentRole?: string;
      education?: Array<{
        degree: string;
        institution: string;
        year: number;
      }>;
      certifications?: string[];
    };
    aiSummary?: string;
    aiModel?: string;
  };
  applicationStage:
    | 'screening'
    | 'shortlisted'
    | 'phone_screen'
    | 'technical_interview'
    | 'hr_interview'
    | 'offer'
    | 'hired'
    | 'rejected';
  appliedAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>(
  {
    jobPostingId: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true, index: true },
    candidatePhone: { type: String },
    resumeUrl: { type: String, required: true },
    resumeText: { type: String },
    aiScreening: {
      overallScore: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['pending', 'shortlisted', 'rejected', 'review'],
        default: 'pending',
      },
      processedAt: { type: Date },
      scores: {
        skillsMatch: { type: Number, default: 0 },
        experienceMatch: { type: Number, default: 0 },
        educationMatch: { type: Number, default: 0 },
        keywordsMatch: { type: Number, default: 0 },
      },
      matchedSkills: [{ type: String }],
      missingSkills: [{ type: String }],
      extractedInfo: {
        totalExperience: { type: Number },
        currentCompany: { type: String },
        currentRole: { type: String },
        education: [
          {
            degree: { type: String },
            institution: { type: String },
            year: { type: Number },
          },
        ],
        certifications: [{ type: String }],
      },
      aiSummary: { type: String },
      aiModel: { type: String },
    },
    applicationStage: {
      type: String,
      enum: [
        'screening',
        'shortlisted',
        'phone_screen',
        'technical_interview',
        'hr_interview',
        'offer',
        'hired',
        'rejected',
      ],
      default: 'screening',
    },
    appliedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

export const Resume = model<IResume>('Resume', ResumeSchema);
