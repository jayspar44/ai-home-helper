// POST /api/register
const { handleCors } = require('../utils/cors');
const { initializeFirebase, admin } = require('../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name } = req.body;
    const { db, auth } = initializeFirebase();
    
    const userRecord = await auth.createUser({ email, password, displayName: name });
    const homeRef = await db.collection('homes').add({
      name: `${name}'s Home`,
      members: { [userRecord.uid]: 'admin' }
    });
    
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      primaryHomeId: homeRef.id,
      homes: { [homeRef.id]: 'admin' }
    });
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    let errorMessage = 'Failed to create user.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'This email address is already in use.';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Password is not valid. It must be at least 6 characters long.';
    }
    res.status(400).json({ error: errorMessage });
  }
}