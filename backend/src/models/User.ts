import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'manager' | 'hr_recruiter' | 'employee';
  department?: Types.ObjectId;
  reportingManagerId?: Types.ObjectId;
  profilePhoto?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  employmentDetails?: {
    designation: string;
    employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
    joiningDate: Date;
    probationEndDate?: Date;
    confirmationDate?: Date;
    workLocation?: string;
    workMode: 'onsite' | 'remote' | 'hybrid';
    noticePeriod: number; // in days
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  documents?: Array<{
    type: 'aadhaar' | 'pan' | 'passport' | 'degree' | 'experience_letter';
    url: string;
    uploadedAt: Date;
    verified: boolean;
  }>;
  skills: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date | null;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'manager', 'hr_recruiter', 'employee'] },
    department: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    reportingManagerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    profilePhoto: { type: String },
    phone: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String },
    },
    emergencyContact: {
      name: { type: String },
      relation: { type: String },
      phone: { type: String },
    },
    employmentDetails: {
      designation: { type: String },
      employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern'] },
      joiningDate: { type: Date },
      probationEndDate: { type: Date },
      confirmationDate: { type: Date },
      workLocation: { type: String },
      workMode: { type: String, enum: ['onsite', 'remote', 'hybrid'] },
      noticePeriod: { type: Number, default: 60 },
    },
    bankDetails: {
      accountNumber: { type: String }, // In real app, encrypt this at rest
      ifscCode: { type: String },
      bankName: { type: String },
      accountHolderName: { type: String },
    },
    documents: [
      {
        type: { type: String, enum: ['aadhaar', 'pan', 'passport', 'degree', 'experience_letter'] },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        verified: { type: Boolean, default: false },
      },
    ],
    skills: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    refreshTokens: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>('User', UserSchema);
