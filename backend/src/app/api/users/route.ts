import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models'

// GET endpoint to list all users (for development/admin purposes)
export async function GET(request: NextRequest) {
  try {
    // Connect to database
    try {
      await connectDB()
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed. Please try again later.',
        },
        { status: 503 }
      )
    }

    // Get all users (without passwords)
    const users = await User.find({})
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      })),
      count: users.length
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Failed to fetch users',
      },
      { status: 500 }
    )
  }
}

