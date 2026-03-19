import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Connect to database
    try {
      await connectDB()
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
        },
        { status: 503 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists' },
        { status: 409 }
      )
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      name: name || null,
      password: password, // Will be hashed by pre-save hook
      role: 'USER'
    })

    await user.save()

    // Create audit log
    const { AuditLog } = await import('@/models')
    await AuditLog.create({
      userId: user._id,
      action: 'USER_REGISTER',
      payload: JSON.stringify({ email }),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // Return user without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }

    return NextResponse.json({
      success: true,
      user: userResponse
    })
  } catch (error: any) {
    console.error('Error registering user:', error)
    
    // Handle MongoDB duplicate key error
    if (error?.code === 11000 || error?.message?.includes('duplicate')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User already exists with this email'
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error?.message || 'Failed to register user',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}