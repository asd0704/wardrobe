import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Outfit, User, Item, AuditLog } from '@/models'

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  // In a real application, you would get the user ID from the session or token
  return request.headers.get('x-user-id')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    const outfit = await Outfit.findById(params.id)
      .populate({
        path: 'userId',
        select: 'id name email',
        model: User
      })
      .populate({
        path: 'items.item',
        model: Item
      })
      .lean()

    if (!outfit) {
      return NextResponse.json(
        { error: 'Outfit not found' },
        { status: 404 }
      )
    }

    if (outfit.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(outfit)
  } catch (error) {
    console.error('Error fetching outfit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outfit' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      isPublic,
      items
    } = body

    // Connect to database
    await connectDB()

    const existingOutfit = await Outfit.findById(params.id)

    if (!existingOutfit) {
      return NextResponse.json(
        { error: 'Outfit not found' },
        { status: 404 }
      )
    }

    if (existingOutfit.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (items !== undefined) updateData.items = items.map((item: any) => ({ item: item.id, position: item.position }))

    const outfit = await Outfit.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'UPDATE_OUTFIT',
      payload: JSON.stringify({ outfitId: params.id, changes: updateData }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(outfit)
  } catch (error) {
    console.error('Error updating outfit:', error)
    return NextResponse.json(
      { error: 'Failed to update outfit' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    const existingOutfit = await Outfit.findById(params.id)

    if (!existingOutfit) {
      return NextResponse.json(
        { error: 'Outfit not found' },
        { status: 404 }
      )
    }

    if (existingOutfit.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await Outfit.findByIdAndDelete(params.id)

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: 'DELETE_OUTFIT',
      payload: JSON.stringify({ outfitId: params.id }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ message: 'Outfit deleted successfully' })
  } catch (error) {
    console.error('Error deleting outfit:', error)
    return NextResponse.json(
      { error: 'Failed to delete outfit' },
      { status: 500 }
    )
  }
}
