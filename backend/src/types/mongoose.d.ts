// Type augmentation for Mongoose to handle ObjectId references in schemas
import { Schema } from 'mongoose';

declare module 'mongoose' {
  interface IndexOptions {
    unique?: boolean;
  }
  
  // Allow any for schema definitions to bypass strict typing
  interface SchemaDefinition {
    [path: string]: any;
  }
}
