require('dotenv').config();
const { MongoClient } = require('mongodb');

async function auditBoothLabels() {
  const { MONGODB_URI } = process.env;
  if (!MONGODB_URI) {
    console.log('No MONGODB_URI configured in environment.');
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const exposColl = db.collection('expos');
    const appsColl = db.collection('applications');

    const expos = await exposColl.find({}).toArray();
    console.log(`Auditing ${expos.length} expos...`);

    let totalApproved = 0;
    let mismatched = 0;

    for (const expo of expos) {
      const approvedApps = await appsColl.find({ expoId: expo._id, status: 'approved' }).toArray();
      totalApproved += approvedApps.length;
      const spatialBooths = (expo.spatialLayout?.booths || []).map(b => b.boothLabel);

      for (const app of approvedApps) {
        if (spatialBooths.length > 0) {
          const match = spatialBooths.includes(app.boothLabel);
          if (!match) {
            mismatched++;
            console.log(`MISMATCH: Expo "${expo.name}" (ID: ${expo._id}) - App "${app.companyName}" has boothLabel "${app.boothLabel}", but spatialLayout has: [${spatialBooths.join(', ')}]`);
          } else {
            console.log(`MATCH: Expo "${expo.name}" - App "${app.companyName}" assigned "${app.boothLabel}"`);
          }
        } else {
          console.log(`NO SPATIAL LAYOUT: Expo "${expo.name}" (ID: ${expo._id}) - App "${app.companyName}" has boothLabel "${app.boothLabel}"`);
        }
      }
    }

    console.log(`\nAudit complete: ${totalApproved} approved applications, ${mismatched} mismatched against defined spatial layouts.`);
  } catch (err) {
    console.error('Audit failed:', err.message);
  } finally {
    await client.close();
  }
}

auditBoothLabels();
