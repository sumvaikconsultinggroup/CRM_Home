const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

async function main() {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const db = client.db('buildcrm');
  
  // Find XYZ Interiors
  const xyzClient = await db.collection('clients').findOne({ businessName: /xyz/i });
  console.log('XYZ Client:', xyzClient?.businessName, xyzClient?.clientId);
  
  // Add Build Inventory assignment
  if (xyzClient) {
    const assignment = {
      id: uuidv4(),
      clientId: xyzClient.clientId || xyzClient.id,
      clientName: xyzClient.businessName,
      productId: 'build-inventory',
      productName: 'Build Inventory',
      planTier: 'starter',
      status: 'active',
      syncEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('client_products').updateOne(
      { clientId: assignment.clientId, productId: 'build-inventory' },
      { $set: assignment },
      { upsert: true }
    );
    
    // Update client with assigned products
    await db.collection('clients').updateOne(
      { _id: xyzClient._id },
      { $addToSet: { assignedProducts: 'build-inventory' } }
    );
    
    console.log('Assigned Build Inventory to:', xyzClient.businessName);
  }
  
  await client.close();
}
main().catch(console.error);
