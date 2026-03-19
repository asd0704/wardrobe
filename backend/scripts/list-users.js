// Script to list all users from MongoDB
// Run with: node scripts/list-users.js

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard';

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: String,
  role: String,
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function listUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const users = await User.find({}).select('-password').sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('No users found in the database.');
      console.log('You can create a new account through the registration form.\n');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      console.log('='.repeat(80));
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. User:`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name || '(not set)'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${user.createdAt}`);
      });
      console.log('\n' + '='.repeat(80));
      console.log('\nNote: Passwords are hashed and cannot be retrieved.');
      console.log('To login, use the email address shown above.');
      console.log('If you forgot your password, you would need to reset it or create a new account.\n');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();

