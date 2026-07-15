/// <reference path="../../../storage/types.d.ts" />
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb'
import { StorageProvider } from './StorageProvider'
import { v4 as uuidv4 } from 'uuid'

// Simple singleton MongoDB connection manager.
type MongoClientInstance = Awaited<ReturnType<typeof MongoClient.connect>>

let clientPromise: Promise<MongoClientInstance> | null = null
export async function getMongoClient(): Promise<MongoClientInstance> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set')
    }
    clientPromise = MongoClient.connect(uri)
  }
  return clientPromise
}

export class GridFSProvider implements StorageProvider {
  async store(
    file: Buffer,
    filename: string,
    mimeType: string,
    userId: string,
    organizationId: string
  ): Promise<{ fileId: string }> {
    const client = await getMongoClient()
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: 'uaipFiles' })

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        userId,
        organizationId,
        mimeType,
        originalName: filename,
        size: file.length,
        processingId: uuidv4(),
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadStream.end(file, (err: any, fileDoc: any) => {
        if (err) return reject(err)
        resolve()
      })
    })

    // The file's ObjectId is available via uploadStream.id
    const fileId = uploadStream.id.toString()
    return { fileId }
  }

  async delete(fileId: string): Promise<void> {
    const client = await getMongoClient()
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: 'uaipFiles' })
    const _id = new ObjectId(fileId)
    await bucket.delete(_id)
  }

  async getFile(fileId: string): Promise<Buffer> {
    const client = await getMongoClient()
    const db = client.db()
    const bucket = new GridFSBucket(db, { bucketName: 'uaipFiles' })
    const _id = new ObjectId(fileId)
    const downloadStream = bucket.openDownloadStream(_id)
    const chunks: Buffer[] = []
    return new Promise<Buffer>((resolve, reject) => {
      downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk))
      downloadStream.on('error', (err: any) => reject(err))
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }
}
