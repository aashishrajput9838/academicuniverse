import { Schema, model, Document, Types } from 'mongoose';

export interface IPerson extends Document {
  organizationId: Types.ObjectId; // tenant
  primaryName: string;
  primaryEmail: string;
  // optional link to user accounts (e.g., authentication userId)
  userIds: Types.ObjectId[]; // could hold multiple auth IDs
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true, ref: 'Organization' },
    primaryName: { type: String, required: true },
    primaryEmail: { type: String, required: true },
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  } as any,
  { timestamps: true }
);

export const Person = model<IPerson>('Person', PersonSchema);
