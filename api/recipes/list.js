// POST /api/recipes/list
const { handleCors } = require('../../utils/cors');
const { checkAuth } = require('../../utils/auth');
const { initializeFirebase } = require('../../utils/firebase');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await checkAuth(req, res);
  if (!user) return;

  try {
    const { homeId } = req.body;
    if (!homeId) return res.status(400).json({ error: "homeId is required." });
    
    const { db } = initializeFirebase();
    const recipesSnapshot = await db.collection('homes').doc(homeId).collection('recipes').get();
    const recipeList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(recipeList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
}