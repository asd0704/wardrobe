import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard'

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('MongoDB is already connected.')
    return mongoose.connection
  }

  try {
    // If already connecting, wait for it
    if (mongoose.connection.readyState === 2) {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('connected', resolve)
        mongoose.connection.once('error', reject)
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      })
      isConnected = true
      return mongoose.connection
    }

    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    console.log(`MongoDB Connected: ${conn.connection.host}`)
    isConnected = true
    return conn
  } catch (error) {
    console.error('MongoDB connection error:', error)
    isConnected = false
    // Don't exit process in API routes - throw error instead
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Connection state management
let isConnected = false

mongoose.connection.on('connected', () => {
  isConnected = true
  console.log('MongoDB connected successfully')
})

mongoose.connection.on('error', (err) => {
  isConnected = false
  console.error('MongoDB connection error:', err)
})


mongoose.connection.on('disconnected', () => {
  isConnected = false
  console.log('MongoDB disconnected')
})

export { connectDB, mongoose }
export const db = mongoose