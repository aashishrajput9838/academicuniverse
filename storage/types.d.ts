// Temporary compatibility shim for missing type definitions of 'mongodb' and 'uuid' packages. This should be removed once proper @types packages are installed.
declare module 'mongodb' {
  export const MongoClient: any;
  export type MongoClient = any;
  export const GridFSBucket: any;
  export type GridFSBucket = any;
  export const ObjectId: any;
  export type ObjectId = any;
}

declare module 'uuid' {
  export function v4(): string;
}
