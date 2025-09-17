// Authentication middleware for Vercel serverless functions
const { initializeFirebase } = require('./firebase');

async function checkAuth(req, res) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return null;
  }

  const idToken = req.headers.authorization.split('Bearer ')[1];
  try {
    const { auth } = initializeFirebase();
    const user = await auth.verifyIdToken(idToken);
    return user;
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return null;
  }
}

module.exports = { checkAuth };