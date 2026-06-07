import { Schema, model, Document, Types } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  headId?: Types.ObjectId;
  parentDepartmentId?: Types.ObjectId;
  description?: string;
  budget?: number;
  headcount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    headId: { type: Schema.Types.ObjectId, ref: 'User' },
    parentDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    description: { type: String },
    budget: { type: Number, default: 0 },
    headcount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Department = model<IDepartment>('Department', DepartmentSchema);
