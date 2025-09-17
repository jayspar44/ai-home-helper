// POST /api/pantry/[homeId]/detect-items
// AI-powered pantry item detection with image upload
const { handleCors } = require('../../../utils/cors');
const { checkAuth } = require('../../../utils/auth');
const { initializeFirebase } = require('../../../utils/firebase');
const { initializeGemini } = require('../../../utils/gemini');

// Vercel serverless config for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await checkAuth(req, res);
  if (!user) return;

  try {
    const { homeId } = req.query;
    const userUid = user.uid;
    const { db } = initializeFirebase();

    // Verify user belongs to home
    const homeDoc = await db.collection('homes').doc(homeId).get();
    if (!homeDoc.exists || !homeDoc.data().members[userUid] === undefined) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Parse the form data for file upload
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Image data and mime type required' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heif', 'image/heic'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and HEIF images are allowed.' });
    }

    // Create the AI prompt for food detection
    const prompt = `You are an expert at identifying food items in images. Analyze this image and detect all food items visible.

For each item detected, you MUST provide ALL fields:
1. Name: Be specific (e.g., "Honeycrisp Apples" not just "apples", "Whole Wheat Bread" not just "bread")
2. Quantity: Estimate based on visual cues (e.g., "3 apples", "1 loaf", "2 lbs", "1 carton")
3. Location: ALWAYS determine storage location based on item type:
   - Fresh produce, dairy, meat, leftovers → "fridge"
   - Frozen items → "freezer" 
   - Dry goods, canned items, snacks, spices → "pantry"
4. Days until expiry: ALWAYS estimate realistic shelf life:
   - Fresh produce: 3-10 days
   - Dairy: 5-14 days
   - Meat/fish: 1-5 days
   - Bread: 3-7 days
   - Pantry items: 30-365 days
   - Consider visible freshness cues
5. Confidence: Your confidence level (0.0-1.0) in this detection

CRITICAL: Every item MUST have location and daysUntilExpiry fields filled with realistic values.

Respond ONLY with a JSON array, no other text:
[
  {
    "name": "Item name",
    "quantity": "Amount with unit", 
    "location": "pantry|fridge|freezer",
    "daysUntilExpiry": number,
    "confidence": 0.0-1.0
  }
]

If no food items are detected, return an empty array: []`;

    // Call Gemini API
    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let detectedItems = [];
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        detectedItems = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', text);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Validate and format detected items
    const formattedItems = detectedItems.map(item => ({
      name: item.name || 'Unknown Item',
      quantity: item.quantity || '1 item',
      location: ['pantry', 'fridge', 'freezer'].includes(item.location) ? item.location : 'pantry',
      expiresAt: new Date(Date.now() + (item.daysUntilExpiry || 7) * 24 * 60 * 60 * 1000),
      daysUntilExpiry: item.daysUntilExpiry || 7,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
      detectedBy: 'ai'
    }));

    res.json({ items: formattedItems });

  } catch (error) {
    console.error('Error in AI detection:', error);
    res.status(500).json({ 
      error: 'Failed to process image', 
      details: error.message 
    });
  }
}