// Script to add a dummy user to MongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function addDummyUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Dummy user credentials
    const dummyEmail = 'test@example.com';
    const dummyPassword = 'test123';
    const dummyName = 'Test User';

    // Check if user already exists
    const existingUser = await User.findOne({ email: dummyEmail.toLowerCase() });
    
    if (existingUser) {
      console.log(`⚠️  User with email "${dummyEmail}" already exists!`);
      console.log('\nYou can login with:');
      console.log(`   Email: ${dummyEmail}`);
      console.log(`   Password: (the password you set when creating this account)`);
      console.log('\nOr I can create a different test user. Let me try with a different email...\n');
      
      // Try with a different email
      const altEmail = 'demo@test.com';
      const altExisting = await User.findOne({ email: altEmail.toLowerCase() });
      
      if (altExisting) {
        console.log(`⚠️  User with email "${altEmail}" also exists!`);
        console.log('\nHere are all existing users:');
        const allUsers = await User.find({}).select('email name role createdAt');
        allUsers.forEach((user, i) => {
          console.log(`   ${i + 1}. ${user.email} (${user.name || 'No name'})`);
        });
      } else {
        // Create with alternative email
        const newUser = new User({
          email: altEmail,
          name: 'Demo User',
          password: 'demo123',
          role: 'USER'
        });
        
        await newUser.save();
        console.log('✅ Successfully created dummy user!');
        console.log('\n📧 Login Credentials:');
        console.log(`   Email: ${altEmail}`);
        console.log(`   Password: demo123`);
        console.log('\nYou can now login with these credentials.\n');
      }
    } else {
      // Create new user
      const newUser = new User({
        email: dummyEmail,
        name: dummyName,
        password: dummyPassword,
        role: 'USER'
      });
      
      await newUser.save();
      console.log('✅ Successfully created dummy user!');
      console.log('\n📧 Login Credentials:');
      console.log(`   Email: ${dummyEmail}`);
      console.log(`   Password: ${dummyPassword}`);
      console.log('\nYou can now login with these credentials.\n');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   This email already exists in the database.');
    }
    process.exit(1);
  }
}

addDummyUser();

