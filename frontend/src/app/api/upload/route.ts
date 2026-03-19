import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { connectDB } from '@/lib/db'
import { 
  extractColorsFromImage,
  identifyClothingType,
  suggestOccasion,
  suggestSeason,
  generateItemName,
  createGeminiAPI
} from '@/lib/gemini'
import { Item, ItemHistory, AuditLog } from '@/models'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    const occasion = formData.get('occasion') as string || 'CASUAL'
    const season = formData.get('season') as string || 'ALL_SEASON'

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory already exists
    }

    // Save original file
    const filename = `${Date.now()}-${file.name}`
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Convert image to base64 for Gemini analysis
    const imageBase64 = buffer.toString('base64')
    const mimeType = file.type

    // Connect to database
    await connectDB()

    // Initialize Gemini API
    try {
      createGeminiAPI()
    } catch (error) {
      console.error('Gemini API initialization failed:', error)
      return NextResponse.json(
        { error: 'AI service not available' },
        { status: 500 }
      )
    }

    let processedUrl = `/uploads/${filename}`
    let colors = ['Unknown']
    let detectedType = type
    let detectedOccasion = occasion
    let detectedSeason = season
    let detectedName = name || file.name.split('.')[0]
    
    try {
      // Perform AI analysis in parallel for better performance
      const [
        extractedColors,
        clothingType,
        suggestedOccasion,
        suggestedSeason,
        itemName
      ] = await Promise.allSettled([
        extractColorsFromImage(imageBase64, mimeType),
        identifyClothingType(imageBase64, mimeType),
        suggestOccasion(imageBase64, mimeType),
        suggestSeason(imageBase64, mimeType),
        generateItemName(imageBase64, mimeType)
      ])

      // Use AI results if successful, otherwise fall back to provided values
      if (extractedColors.status === 'fulfilled') {
        colors = extractedColors.value
      } else {
        console.error('extractColorsFromImage failed:', extractedColors.reason);
      }
      
      if (clothingType.status === 'fulfilled') {
        detectedType = clothingType.value
      } else {
        console.error('identifyClothingType failed:', clothingType.reason);
      }
      
      if (suggestedOccasion.status === 'fulfilled') {
        detectedOccasion = suggestedOccasion.value
      } else {
        console.error('suggestOccasion failed:', suggestedOccasion.reason);
      }
      
      if (suggestedSeason.status === 'fulfilled') {
        detectedSeason = suggestedSeason.value
      } else {
        console.error('suggestSeason failed:', suggestedSeason.reason);
      }
      
      if (itemName.status === 'fulfilled') {
        detectedName = itemName.value
      } else {
        console.error('generateItemName failed:', itemName.reason);
      }

      // Generate a processed version (in real implementation, this would remove background)
      const processedFilename = `processed-${filename}`
      const processedFilepath = join(uploadsDir, processedFilename)
      await writeFile(processedFilepath, buffer)
      processedUrl = `/uploads/${processedFilename}`

    } catch (error) {
      console.error('AI processing failed:', error)
      // Continue with fallback values
    }

    // Create thumbnail URL (in real implementation, you'd generate actual thumbnails)
    const thumbnailUrl = `/uploads/${filename}`

    // Save to database
    const item = new Item({
      userId,
      name: detectedName,
      filename,
      objectUrl: `/uploads/${filename}`,
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

    return NextResponse.json({
      success: true,
      item: {
        id: item._id,
        ...item.toObject(),
        colors: colors
      },
      aiAnalysis: {
        colors,
        type: detectedType,
        occasion: detectedOccasion,
        season: detectedSeason,
        name: detectedName
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