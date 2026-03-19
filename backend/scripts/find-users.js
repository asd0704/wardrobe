// Script to find existing users in MongoDB
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

async function findUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Get all users
    const users = await User.find({}).sort({ createdAt: -1 });

    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      console.log('\nYou need to create an account first using the registration form.');
    } else {
      console.log(`✅ Found ${users.length} user(s) in the database:\n`);
      console.log('='.repeat(90));
      
      users.forEach((user, index) => {
        console.log(`\n📧 User #${index + 1}:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name || '(not set)'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
        console.log(`   Has Password: ${user.password ? 'Yes (hashed)' : 'No'}`);
      });
      
      console.log('\n' + '='.repeat(90));
      console.log('\n⚠️  IMPORTANT: Passwords are encrypted (hashed) and cannot be retrieved.');
      console.log('   You can only see the email addresses above.');
      console.log('\n💡 To login:');
      console.log('   1. Use one of the email addresses shown above');
      console.log('   2. If you don\'t remember the password, you need to:');
      console.log('      - Try common passwords you might have used');
      console.log('      - Create a new account with a different email');
      console.log('      - Or reset the password (if that feature exists)');
      console.log('\n');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findUsers();

