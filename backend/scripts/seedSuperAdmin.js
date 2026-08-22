require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seedSuperAdmin() {
  // Validation
  const { MONGODB_URI, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.error('ERROR: Missing required environment variables');
    console.error('Required: MONGODB_URI, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD');
    process.exit(1);
  }

  if (SUPERADMIN_PASSWORD.length < 8) {
    console.error('ERROR: SUPERADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if SuperAdmin exists
    const existingSuperAdmin = await usersCollection.findOne({
      role: 'superadmin'
    });

    // Hash password
    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    if (existingSuperAdmin) {
      // Update existing SuperAdmin
      await usersCollection.updateOne(
        { _id: existingSuperAdmin._id },
        {
          $set: {
            email: SUPERADMIN_EMAIL.toLowerCase(),
            passwordHash: passwordHash,
            updatedAt: new Date()
          }
        }
      );
      console.log('✓ SuperAdmin account updated successfully');
      console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    } else {
      // Create new SuperAdmin
      await usersCollection.insertOne({
        email: SUPERADMIN_EMAIL.toLowerCase(),
        passwordHash: passwordHash,
        fullName: 'Super Admin',
        role: 'superadmin',
        status: 'active',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ SuperAdmin account created successfully');
      console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

seedSuperAdmin();
