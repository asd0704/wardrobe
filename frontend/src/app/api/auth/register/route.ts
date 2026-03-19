import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
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
  } catch (error) {
    console.error('Error registering user:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}