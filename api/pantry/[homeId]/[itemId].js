// PUT|DELETE /api/pantry/[homeId]/[itemId]
// Handles individual pantry item operations
const { handleCors } = require('../../../utils/cors');
const { checkAuth } = require('../../../utils/auth');
const { initializeFirebase, admin } = require('../../../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await checkAuth(req, res);
  if (!user) return;

  const { homeId, itemId } = req.query;
  const { db } = initializeFirebase();

  if (req.method === 'PUT') {
    return await updatePantryItem(req, res, homeId, itemId, user, db);
  } else if (req.method === 'DELETE') {
    return await deletePantryItem(req, res, homeId, itemId, user, db);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function updatePantryItem(req, res, homeId, itemId, user, db) {
  try {
    const { name, location, quantity, expiresAt, daysUntilExpiry, confidence, detectedBy } = req.body;
    const userUid = user.uid;

    // Validate location
    if (!['pantry', 'fridge', 'freezer'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify item exists
    const itemRef = db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .doc(itemId);
    
    const item = await itemRef.get();
    if (!item.exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedFields = {
      name,
      location,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add optional fields
      ...(quantity && { quantity }),
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      ...(daysUntilExpiry !== undefined && { daysUntilExpiry }),
      ...(confidence !== undefined && { confidence }),
      ...(detectedBy && { detectedBy })
    };

    await itemRef.update(updatedFields);

    const resultData = { 
      id: itemId,
      ...item.data(),
      ...updatedFields
    };
    // Don't send back server timestamp object
    delete resultData.updatedAt;

    res.json(resultData);
  } catch (error) {
    console.error('Error updating pantry item:', error);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
}

async function deletePantryItem(req, res, homeId, itemId, user, db) {
  try {
    const userUid = user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify item exists before deletion
    const itemRef = db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .doc(itemId);
    
    const item = await itemRef.get();
    if (!item.exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await itemRef.delete();
    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting pantry item:', error);
    res.status(500).json({ error: 'Failed to delete pantry item' });
  }
}