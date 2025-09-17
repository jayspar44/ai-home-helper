// GET|POST /api/pantry/[homeId]
// Handles main pantry operations for a specific home
const { handleCors } = require('../../utils/cors');
const { checkAuth } = require('../../utils/auth');
const { initializeFirebase, admin } = require('../../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await checkAuth(req, res);
  if (!user) return;

  const { homeId } = req.query;
  const { db } = initializeFirebase();

  if (req.method === 'GET') {
    return await getPantryItems(req, res, homeId, user, db);
  } else if (req.method === 'POST') {
    return await addPantryItem(req, res, homeId, user, db);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getPantryItems(req, res, homeId, user, db) {
  try {
    const userUid = user.uid;

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get items from the subcollection
    const itemsSnap = await db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .orderBy('createdAt', 'desc')
      .get();

    const items = [];
    itemsSnap.forEach(doc => {
      items.push({ 
        id: doc.id, 
        ...doc.data(),
        // Ensure location is always present
        location: doc.data().location || 'pantry' 
      });
    });

    // Set explicit JSON content type
    res.setHeader('Content-Type', 'application/json');
    return res.json(items);
  } catch (error) {
    console.error('Error fetching pantry items:', error);
    return res.status(500).json({ error: 'Failed to fetch pantry items' });
  }
}

async function addPantryItem(req, res, homeId, user, db) {
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

    const newItem = {
      name,
      location,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: userUid,
      // Add new optional fields
      ...(quantity && { quantity }),
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      ...(daysUntilExpiry !== undefined && { daysUntilExpiry }),
      ...(confidence !== undefined && { confidence }),
      ...(detectedBy && { detectedBy })
    };

    // Add to the subcollection
    const itemRef = await db.collection('homes')
      .doc(homeId)
      .collection('pantry_items')
      .add(newItem);

    const resultData = { 
      id: itemRef.id, 
      ...newItem
    };
    // Don't send back server timestamp object
    delete resultData.createdAt;

    res.status(201).json(resultData);

  } catch (error) {
    console.error('Error adding pantry item:', error);
    res.status(500).json({ error: 'Failed to add pantry item' });
  }
}