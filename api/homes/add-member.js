// POST /api/homes/add-member
const { handleCors } = require('../../utils/cors');
const { checkAuth } = require('../../utils/auth');
const { initializeFirebase, admin } = require('../../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await checkAuth(req, res);
  if (!user) return;

  try {
    const { homeId, newUserEmail } = req.body;
    const adminId = user.uid;
    const { db, auth } = initializeFirebase();
    
    const userToAddRecord = await auth.getUserByEmail(newUserEmail);
    const userToAddId = userToAddRecord.uid;
    const homeRef = db.collection('homes').doc(homeId);
    const userToAddRef = db.collection('users').doc(userToAddId);

    await db.runTransaction(async (transaction) => {
      const homeDoc = await transaction.get(homeRef);
      if (!homeDoc.exists) throw new Error("Home not found.");
      const homeData = homeDoc.data();
      if (homeData.members[adminId] !== 'admin') {
        throw new Error("You don't have permission to add members to this home.");
      }
      transaction.update(homeRef, { [`members.${userToAddId}`]: 'member' });
      transaction.update(userToAddRef, { [`homes.${homeId}`]: 'member' });
    });

    res.status(200).json({ message: `User ${newUserEmail} added to home successfully.` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}