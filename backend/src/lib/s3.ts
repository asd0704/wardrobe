import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  // Credentials will be automatically picked up from IAM role if running on EC2
  // For local development, use AWS credentials file or environment variables
})

const BUCKET_NAME = process.env.S3_BUCKET || ''

export interface UploadResult {
  url: string
  thumbnailUrl: string
  key: string
  thumbnailKey: string
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET environment variable is not set')
  }

  const key = `uploads/${filename}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year
  })

  await s3Client.send(command)

  // Return public URL (if bucket is configured for public access)
  // Or use presigned URLs for private buckets
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`
}

/**
 * Upload multiple files (main image and thumbnail)
 */
export async function uploadImagePair(
  mainBuffer: Buffer,
  thumbnailBuffer: Buffer,
  filename: string
): Promise<UploadResult> {
  const thumbnailFilename = `thumb-${filename}`
  
  const [url, thumbnailUrl] = await Promise.all([
    uploadToS3(mainBuffer, filename, 'image/jpeg'),
    uploadToS3(thumbnailBuffer, thumbnailFilename, 'image/jpeg'),
  ])

  return {
    url,
    thumbnailUrl,
    key: `uploads/${filename}`,
    thumbnailKey: `uploads/${thumbnailFilename}`,
  }
}

/**
 * Get a presigned URL for private file access
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET environment variable is not set')
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('S3_BUCKET environment variable is not set')
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!BUCKET_NAME
}

