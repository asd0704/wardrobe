import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { connectDB } from '@/lib/db'
import sharp from 'sharp'
import { 
  extractColorsFromImage,
  identifyClothingType,
  suggestOccasion,
  suggestSeason,
  generateItemName,
  createHuggingFaceClient
} from '@/lib/huggingface'
import {
  getOpenAIClient,
} from '@/lib/openai'

import { uploadImagePair, isS3Configured } from '@/lib/s3'
import { Item, ItemHistory, AuditLog } from '@/models'

async function analyzeImageWithOpenAI(imageBase64: string, mimeType: string) {
  const client = getOpenAIClient()
  if (!client) {
    console.warn('OpenAI client not configured; skipping analysis.')
    return null
  }

  // If the client exposes a dedicated analysis helper, use it.
  if (typeof (client as any).analyzeImage === 'function') {
    try {
      return await (client as any).analyzeImage(imageBase64, mimeType)
    } catch (err) {
      console.error('Error from client.analyzeImage:', err)
      return null
    }
  }

  console.warn('OpenAI client does not expose analyzeImage; skipping analysis.')
  return null
}
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const occasion = formData.get('occasion') as string || 'CASUAL'
    const season = formData.get('season') as string || 'ALL_SEASON'

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: file and userId are required' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const originalBuffer = Buffer.from(bytes)

    // Process and compress image using Sharp
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
    
    let processedBuffer: Buffer
    let mimeType = file.type || 'image/jpeg'
    
    try {
      // Resize and compress image
      // Max width: 1200px, Max height: 1200px, Quality: 85%
      processedBuffer = await sharp(originalBuffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer()
      
      // Update mime type to JPEG after processing
      mimeType = 'image/jpeg'
    } catch (error) {
      console.error('Image processing failed, using original:', error)
      // If Sharp fails, use original buffer
      processedBuffer = originalBuffer
    }

    // Create thumbnail (smaller version for grid view)
    let thumbnailBuffer: Buffer
    try {
      thumbnailBuffer = await sharp(processedBuffer)
        .resize(400, 400, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer()
    } catch (error) {
      console.error('Thumbnail creation failed:', error)
      // Use processed image as thumbnail if thumbnail creation fails
      thumbnailBuffer = processedBuffer
    }

    // Upload to S3 or save locally
    let objectUrl: string
    let thumbnailUrl: string
    let processedUrl: string

    if (isS3Configured()) {
      try {
        // Upload to S3
        const uploadResult = await uploadImagePair(processedBuffer, thumbnailBuffer, filename)
        objectUrl = uploadResult.url
        thumbnailUrl = uploadResult.thumbnailUrl
        processedUrl = uploadResult.url
        console.log('✅ Files uploaded to S3:', { objectUrl, thumbnailUrl })
      } catch (s3Error) {
        console.error('S3 upload failed, falling back to local storage:', s3Error)
        // Fallback to local storage
        const uploadsDir = join(process.cwd(), 'public', 'uploads')
        try {
          await mkdir(uploadsDir, { recursive: true })
        } catch (error) {
          // Directory already exists
        }
        const filepath = join(uploadsDir, filename)
        const thumbnailFilename = `thumb-${filename}`
        const thumbnailPath = join(uploadsDir, thumbnailFilename)
        await writeFile(filepath, processedBuffer)
        await writeFile(thumbnailPath, thumbnailBuffer)
        objectUrl = `/uploads/${filename}`
        thumbnailUrl = `/uploads/${thumbnailFilename}`
        processedUrl = `/uploads/${filename}`
      }
    } else {
      // Use local storage
      const uploadsDir = join(process.cwd(), 'public', 'uploads')
      try {
        await mkdir(uploadsDir, { recursive: true })
      } catch (error) {
        // Directory already exists
      }
      const filepath = join(uploadsDir, filename)
      const thumbnailFilename = `thumb-${filename}`
      const thumbnailPath = join(uploadsDir, thumbnailFilename)
      await writeFile(filepath, processedBuffer)
      await writeFile(thumbnailPath, thumbnailBuffer)
      objectUrl = `/uploads/${filename}`
      thumbnailUrl = `/uploads/${thumbnailFilename}`
      processedUrl = `/uploads/${filename}`
    }

    // Connect to database
    await connectDB()

    // Initialize OpenAI API
    let aiAvailable = false
    const openAIClient = getOpenAIClient()

    // Use the environment variable to determine availability (OpenAI client object may not expose an 'isConfigured' property)
    if (process.env.OPENAI_API_KEY) {
      console.log('✅ OpenAI client is configured and ready.')
      aiAvailable = true
    } else {
      console.warn('⚠️ OpenAI API key not found or client not configured.')
      console.warn('   Make sure .env.local exists and contains OPENAI_API_KEY.')
      aiAvailable = false
    }

  let colors = ['Unknown']
  let detectedType = type
  let detectedOccasion = occasion
  let detectedSeason = season
  // If client didn't provide a name, use a neutral default instead of the original file name
  let detectedName = name && name.trim().length > 0 ? name : 'Untitled Item'

    // Only attempt AI analysis if OpenAI is available
    if (aiAvailable) {
      try {
        const startTime = Date.now()
        // Ensure we pass a base64 string of the processed image to the analysis function
        const imageBase64 = processedBuffer.toString('base64')
        const analysisResult = await analyzeImageWithOpenAI(
          imageBase64,
          mimeType
        )
        const endTime = Date.now()
        console.log(`⏱️ AI analysis completed in ${endTime - startTime}ms`)

        if (analysisResult) {
          detectedName = analysisResult.name || detectedName
          detectedType = analysisResult.type || detectedType
          colors = analysisResult.colors || colors
          detectedOccasion = analysisResult.occasion || detectedOccasion
          detectedSeason = analysisResult.season || detectedSeason

          console.log('📊 Final AI Analysis Results:')
          console.log('   Type:', detectedType)
          console.log('   Name:', detectedName)
          console.log('   Colors:', colors)
          console.log('   Occasion:', detectedOccasion)
          console.log('   Season:', detectedSeason)
        }
      } catch (error) {
        console.error('❌ AI processing failed with error:', error)
      }
    } else {
      console.log('⚠️ Skipping AI analysis - OpenAI API not available.')
    }

    // Save to database
    const item = new Item({
      userId,
      name: detectedName,
      filename,
      objectUrl,
      thumbnailUrl,
      processedUrl,
      colors: colors,
      type: detectedType,
      occasion: detectedOccasion,
      season: detectedSeason,
      laundryStatus: 'IN_WARDROBE',
      usageCount: 0,
      isFavorite: false
    })

  await item.save()

    // Create history entry
    await ItemHistory.create({
      itemId: item._id,
      action: 'CREATED',
      performedBy: userId,
      notes: 'Item uploaded and processed with AI analysis'
    })

    // Create audit log
    await AuditLog.create({
      userId,
      action: 'UPLOAD_ITEM',
      payload: JSON.stringify({ 
        itemId: item._id, 
        filename,
        aiAnalysis: {
          colors,
          type: detectedType,
          occasion: detectedOccasion,
          season: detectedSeason
        }
      }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // For privacy: do not expose the original or generated name in the API response.
    const itemObj = item.toObject()
    const publicItem = {
      id: item._id,
      ...itemObj,
      colors: colors,
      // hide name from response (UI will show blank)
      name: ''
    }

    return NextResponse.json({
      success: true,
      item: publicItem,
      aiAnalysis: {
        colors,
        type: detectedType,
        occasion: detectedOccasion,
        season: detectedSeason,
        // also avoid returning a generated name here
        name: ''
      }
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}