import { Types } from 'mongoose';

/**
 * Safely converts a string to MongoDB ObjectId
 * Handles the type mismatch between Mongoose v7 type definitions and runtime behavior
 */
export function toObjectId(id: string): Types.ObjectId {
  return new (Types.ObjectId as any)(id);
}
