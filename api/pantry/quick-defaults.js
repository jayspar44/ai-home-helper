// POST /api/pantry/quick-defaults
const { handleCors } = require('../../utils/cors');
const { checkAuth } = require('../../utils/auth');
const { initializeGemini } = require('../../utils/gemini');

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await checkAuth(req, res);
  if (!user) return;

  try {
    const { itemName, homeId } = req.body;
    
    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const prompt = `For the food item "${itemName}", provide quick smart defaults for location and expiry days.

Respond with ONLY this JSON format (no other text):
{
  "location": "pantry" | "fridge" | "freezer",
  "daysUntilExpiry": number
}

Use these rules:
- Fresh produce, dairy, meat → "fridge" 
- Frozen items → "freezer"
- Dry goods, canned items, snacks → "pantry"
- Reasonable expiry days (1-3 for fresh, 7-30 for pantry items)`;

    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let defaultsData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*?\}/s);
      if (jsonMatch) {
        defaultsData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing quick defaults response:', parseError);
      console.error('Raw AI response:', text);
      // Return sensible fallback
      defaultsData = {
        location: itemName.toLowerCase().includes('milk') || 
                  itemName.toLowerCase().includes('yogurt') || 
                  itemName.toLowerCase().includes('cheese') || 
                  itemName.toLowerCase().includes('meat') || 
                  itemName.toLowerCase().includes('fish') ? 'fridge' : 'pantry',
        daysUntilExpiry: 7
      };
    }

    res.json(defaultsData);

  } catch (error) {
    console.error('Error in quick-defaults:', error);
    // Return sensible fallback on error
    res.json({
      location: 'pantry',
      daysUntilExpiry: 7
    });
  }
}