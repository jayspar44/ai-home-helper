// GET|POST|DELETE /api/homes/[homeId]
// Handles: /members, /members/[memberId]
const { handleCors } = require('../../utils/cors');
const { checkAuth } = require('../../utils/auth');
const { initializeFirebase, admin } = require('../../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const user = await checkAuth(req, res);
  if (!user) return;

  const { homeId } = req.query;
  const { db } = initializeFirebase();

  // Handle different endpoints based on URL path
  const urlParts = req.url.split('/');
  const endpoint = urlParts[urlParts.length - 1];

  if (endpoint === 'members') {
    // Handle /api/homes/[homeId]/members
    if (req.method === 'GET') {
      return await getHomeMembers(req, res, homeId, user, db);
    } else if (req.method === 'POST') {
      return await addHomeMember(req, res, homeId, user, db);
    }
  } else if (urlParts.includes('members') && urlParts.length > 5) {
    // Handle /api/homes/[homeId]/members/[memberId]
    if (req.method === 'DELETE') {
      const memberId = urlParts[urlParts.length - 1];
      return await removeHomeMember(req, res, homeId, memberId, user, db);
    }
  }

  res.status(404).json({ error: 'Endpoint not found' });
}

async function getHomeMembers(req, res, homeId, user, db) {
  try {
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists) {
      return res.status(404).json({ error: 'Home not found.' });
    }
    const homeData = homeDoc.data();
    const memberIds = Object.keys(homeData.members);
    
    const memberProfiles = [];
    for (const memberId of memberIds) {
      const userDoc = await db.collection('users').doc(memberId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        memberProfiles.push({
          id: memberId,
          name: userData.name,
          email: userData.email,
          role: homeData.members[memberId]
        });
      }
    }
    res.json(memberProfiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch home members.' });
  }
}

async function addHomeMember(req, res, homeId, user, db) {
  try {
    const { email } = req.body;
    const requesterUid = user.uid;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get the home document
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists) {
      return res.status(404).json({ error: 'Home not found' });
    }

    // Check if requester is admin
    const homeData = homeDoc.data();
    if (homeData.members[requesterUid] !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Find user by email
    const userSnapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newMemberDoc = userSnapshot.docs[0];
    const newMemberId = newMemberDoc.id;

    // Check if already a member
    if (homeData.members[newMemberId]) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member to home
    await homeDoc.ref.update({
      [`members.${newMemberId}`]: 'member'
    });

    // Return the new member info
    res.json({
      id: newMemberId,
      email: newMemberDoc.data().email,
      name: newMemberDoc.data().name,
      role: 'member'
    });

  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
}

async function removeHomeMember(req, res, homeId, memberId, user, db) {
  try {
    const adminId = user.uid;

    const homeRef = db.collection('homes').doc(homeId);
    const memberRef = db.collection('users').doc(memberId);

    await db.runTransaction(async (transaction) => {
      const homeDoc = await transaction.get(homeRef);
      if (!homeDoc.exists) throw new Error("Home not found.");
      
      const homeData = homeDoc.data();
      if (homeData.members[adminId] !== 'admin') {
        throw new Error("You do not have permission to remove members.");
      }
      if (adminId === memberId) {
        throw new Error("Admins cannot remove themselves.");
      }

      transaction.update(homeRef, { [`members.${memberId}`]: admin.firestore.FieldValue.delete() });
      transaction.update(memberRef, { [`homes.${homeId}`]: admin.firestore.FieldValue.delete() });
    });
    
    res.status(200).json({ message: 'Member removed successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}