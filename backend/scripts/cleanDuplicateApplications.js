require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkAndCleanDuplicateApplications() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB database:', client.db().databaseName);
    const db = client.db();
    const appCollection = db.collection('applications');

    // Find all applications with status pending or approved
    const activeApps = await appCollection.find({
      status: { $in: ['pending', 'approved'] }
    }).sort({ submittedAt: -1, createdAt: -1 }).toArray();

    console.log(`Found ${activeApps.length} active applications in total.`);

    // Group by expoId + exhibitorId
    const groups = new Map();
    for (const app of activeApps) {
      const key = `${app.expoId.toString()}_${app.exhibitorId.toString()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(app);
    }

    const duplicateGroups = [];
    for (const [key, apps] of groups.entries()) {
      if (apps.length > 1) {
        duplicateGroups.push({ key, apps });
      }
    }

    console.log(`Duplicate active application pairs found: ${duplicateGroups.length}`);

    if (duplicateGroups.length === 0) {
      console.log('No duplicate active applications found.');
      return;
    }

    let cleanedCount = 0;
    for (const group of duplicateGroups) {
      console.log(`\nDuplicate pair [expoId_exhibitorId: ${group.key}]: ${group.apps.length} applications`);
      // Most recent is index 0
      const keepApp = group.apps[0];
      const duplicates = group.apps.slice(1);
      console.log(`  Keeping most recent: ID ${keepApp._id} (status: ${keepApp.status}, submittedAt: ${keepApp.submittedAt || keepApp.createdAt})`);

      for (const dup of duplicates) {
        console.log(`  Updating duplicate ID ${dup._id} (was status: ${dup.status}) -> 'withdrawn'`);
        await appCollection.updateOne(
          { _id: dup._id },
          { $set: { status: 'withdrawn', withdrawnAt: new Date(), updatedAt: new Date() } }
        );
        cleanedCount++;
      }
    }

    console.log(`\n✓ Successfully resolved ${cleanedCount} duplicate applications to 'withdrawn'.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await client.close();
  }
}

checkAndCleanDuplicateApplications();
