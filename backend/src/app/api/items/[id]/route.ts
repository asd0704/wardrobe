import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Item, User, ItemHistory, AuditLog } from '@/models'
import { unlink } from 'fs/promises'
import { join } from 'path'

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  // In a real application, you would get the user ID from the session or token
  return request.headers.get('x-user-id')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    // Await params in Next.js 15
    const { id } = await params

    const item: any = await Item.findById(id)
      .populate({
        path: 'userId',
        select: 'id name email',
        model: User
      })
      .lean()

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // item.userId is populated, so it's an object; get its _id or id
    const itemUserId = item.userId?._id?.toString() || item.userId?.id?.toString()
    if (itemUserId !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get item history
    const history = await ItemHistory.find({ itemId: id })
      .populate({
        path: 'performedBy',
        select: 'id name',
        model: User
      })
      .sort({ timestamp: -1 })
      .lean()

    const itemWithHistory = {
      ...item,
      itemHistory: history
    }

    return NextResponse.json(itemWithHistory)
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      colors,
      type,
      occasion,
      occasions,
      season,
      isFavorite
    } = body

    // Connect to database
    await connectDB()

    // Await params in Next.js 15
    const { id } = await params

    const existingItem: any = await Item.findById(id)

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (existingItem.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (colors !== undefined) updateData.colors = colors
    if (type !== undefined) updateData.type = type
    if (occasion !== undefined) updateData.occasion = occasion
    if (season !== undefined) updateData.season = season
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
  if (occasions !== undefined) updateData.occasions = occasions

    const item = await Item.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )

    // Create history entry
    await ItemHistory.create({
      itemId: id,
      action: 'EDITED',
      performedBy: authenticatedUserId,
      notes: 'Item updated'
    })

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'UPDATE_ITEM',
      payload: JSON.stringify({ itemId: id, changes: updateData }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    // Await params in Next.js 15
    const { id } = await params

    const existingItem: any = await Item.findById(id)

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (existingItem.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete associated files from filesystem
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    const filesToDelete = [
      existingItem.filename,
      `processed-${existingItem.filename}`,
      `thumb-${existingItem.filename}`
    ].filter(Boolean)

    for (const fileToDelete of filesToDelete) {
      try {
        const filePath = join(uploadsDir, fileToDelete)
        await unlink(filePath).catch(() => {
          // File might not exist, that's okay
          console.log(`File not found (may already be deleted): ${fileToDelete}`)
        })
      } catch (error) {
        console.error(`Error deleting file ${fileToDelete}:`, error)
        // Continue with deletion even if file deletion fails
      }
    }

    // Delete item from database
    await Item.findByIdAndDelete(id)

    // Delete related history entries
    try {
      await ItemHistory.deleteMany({ itemId: id })
    } catch (error) {
      console.error('Error deleting item history:', error)
      // Continue even if history deletion fails
    }

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'DELETE_ITEM',
      payload: JSON.stringify({ itemId: id, filename: existingItem.filename }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}