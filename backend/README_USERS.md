# How to Check Existing Users for Login

This application uses **MongoDB** to store user data. Passwords are **hashed** (encrypted) using bcrypt, so you cannot see the actual passwords.

## Option 1: Use the API Endpoint (Easiest)

I've created an API endpoint to list all users. Access it at:

**http://localhost:3000/api/users**

This will show you:
- User IDs
- Email addresses
- Names
- Roles
- Creation dates

**Note:** Passwords are never returned for security reasons.

## Option 2: Use the Script

Run the provided script to list users from the command line:

```bash
node scripts/list-users.js
```

This will connect to MongoDB and display all registered users.

## Option 3: Access MongoDB Directly

### Using MongoDB Compass (GUI Tool)

1. Download MongoDB Compass: https://www.mongodb.com/products/compass
2. Connect using this connection string:
   ```
   mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard
   ```
3. Navigate to the `users` collection
4. View all user documents (passwords will be hashed)

### Using MongoDB Shell (mongosh)

```bash
# Install mongosh if you haven't
# Then connect:
mongosh "mongodb+srv://anuj876updon:KUX5YIVuVcyr7QlI@coatcard.fkxlnpr.mongodb.net/Digital_Wardrobe?retryWrites=true&w=majority&appName=Coatcard"

# Once connected, run:
use Digital_Wardrobe
db.users.find({}, {email: 1, name: 1, role: 1, createdAt: 1, _id: 1})
```

## Important Notes

1. **Passwords are Hashed**: You cannot see the original passwords. They are encrypted using bcrypt.

2. **To Login**: Use the email address you see in the database. If you don't remember the password:
   - Try common passwords you might have used
   - Create a new account with a different email
   - Implement a password reset feature (not currently available)

3. **Create a Test Account**: If no users exist, simply use the registration form in the application to create one.

## Quick Test Account Creation

If you want to test the application:

1. Open http://localhost:3000
2. Click "Create Account"
3. Enter:
   - Email: `test@example.com`
   - Password: `test123` (or any password 6+ characters)
   - Name: `Test User` (optional)
4. Click "Create Account"

Then you can login with:
- Email: `test@example.com`
- Password: `test123` (or whatever you entered)

## Security Reminder

- Never share your MongoDB connection string publicly
- Consider using environment variables for sensitive data
- In production, restrict access to the `/api/users` endpoint

