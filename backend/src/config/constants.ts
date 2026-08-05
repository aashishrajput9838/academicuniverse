export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
if (!process.env.JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start without a signing secret.');
}
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/academic_universe';
export const USE_ONTOLOGY_RESOLUTION = process.env.USE_ONTOLOGY_RESOLUTION === 'true';
