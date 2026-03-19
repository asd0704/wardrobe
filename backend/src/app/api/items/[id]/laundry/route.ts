import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Item, ItemHistory, AuditLog } from '@/models'

// Placeholder for authentication
const getAuthenticatedUserId = (request: NextRequest) => {
  // In a real application, you would get the user ID from the session or token
  return request.headers.get('x-user-id')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticatedUserId = getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Connect to database
    await connectDB()

    // Await params in Next.js 15
    const { id } = await params

    const existingItem = await Item.findById(id)

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (existingItem.userId.toString() !== authenticatedUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let newStatus: string
    let historyAction: string

    switch (action) {
      case 'mark_laundry':
        newStatus = 'IN_LAUNDRY'
        historyAction = 'MARKED_LAUNDRY'
        break
      case 'mark_clean':
        newStatus = 'CLEAN'
        historyAction = 'RETURNED'
        break
      case 'mark_worn':
        newStatus = 'IN_WARDROBE'
        historyAction = 'WORN'
        break
      case 'mark_away':
        newStatus = 'AWAY'
        historyAction = 'EDITED'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Prepare update object
    const updateData: any = { laundryStatus: newStatus }
    
    // If marking as worn or moving to laundry (worn then laundered), increment usage count
    if (action === 'mark_worn' || action === 'mark_laundry') {
      updateData.$inc = { usageCount: 1 }
    }

    // Update item with both status and usage count in a single operation
    const item = await Item.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )

    // Create history entry
    await ItemHistory.create({
      itemId: id,
      action: historyAction,
      performedBy: authenticatedUserId,
      notes: (action === 'mark_worn' || action === 'mark_laundry')
        ? `Item marked as worn / moved to laundry. Usage count: ${item.usageCount}`
        : `Status changed to ${newStatus}`
    })

    // Create audit log
    await AuditLog.create({
      userId: authenticatedUserId,
      action: `LAUNDRY_${action.toUpperCase()}`,
      payload: JSON.stringify({ itemId: id, newStatus, usageCount: item.usageCount }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating laundry status:', error)
    return NextResponse.json(
      { error: 'Failed to update laundry status' },
      { status: 500 }
    )
  }
}