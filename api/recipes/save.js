// POST /api/recipes/save
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
    const { homeId, recipe } = req.body;
    if (!homeId || !recipe) return res.status(400).json({ error: "homeId and recipe are required." });
    
    const { db } = initializeFirebase();
    const docRef = await db.collection('homes').doc(homeId).collection('recipes').add(recipe);
    res.status(201).json({ id: docRef.id, ...recipe });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save recipe' });
  }
}