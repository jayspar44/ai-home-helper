// GET /api/user/me
const { handleCors } = require('../../utils/cors');
const { checkAuth } = require('../../utils/auth');
const { initializeFirebase, admin } = require('../../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await checkAuth(req, res);
  if (!user) return;

  try {
    console.log('Fetching profile for user:', user.uid);
    const { db } = initializeFirebase();

    // First verify the user exists in Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      const userData = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('users').doc(user.uid).set(userData);
    }

    // Get user data (either existing or newly created)
    const userData = userDoc.exists ? userDoc.data() : {};
    
    // Fetch homes where user is a member
    const homesSnapshot = await db.collection('homes')
      .where(`members.${user.uid}`, 'in', ['member', 'admin'])
      .get();

    const homes = [];
    homesSnapshot.forEach(doc => {
      homes.push({
        id: doc.id,
        ...doc.data(),
        role: doc.data().members[user.uid]
      });
    });

    const response = {
      uid: user.uid,
      email: user.email,
      name: userData.name || user.displayName || '',
      homes: homes,
      primaryHomeId: userData.primaryHomeId || (homes[0]?.id || null)
    };

    console.log('Sending profile response:', response);
    res.json(response);

  } catch (error) {
    console.error('Server error in /api/user/me:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}