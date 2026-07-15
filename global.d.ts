// Existing declarations

declare module '@google/genai' {
  const genai: any;
  export default genai;
}

declare module 'express' {
  const express: any;
  export default express;
}

declare module 'cors' {
  const cors: any;
  export default cors;
}

declare module 'file-saver' {
  const saveAs: any;
  export { saveAs };
}

declare const jest: any;
declare function describe(description: string, suite: () => void): void;
declare function it(description: string, testFn: () => void): void;
declare function test(description: string, testFn: () => void): void;
declare const expect: any;

// Added declarations for new dependencies used in UAIP implementation

declare module 'mongodb' {
  export const MongoClient: any;
  export const GridFSBucket: any;
  export const ObjectId: any;
}

declare module 'uuid' {
  export function v4(): string;
}
