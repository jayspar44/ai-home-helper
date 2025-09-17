// POST /api/pantry/suggest-item
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

    const prompt = `Analyze this food/pantry item name: "${itemName}"

Your goal is to help users create specific, useful pantry entries. Provide suggestions based on confidence level:

HIGH CONFIDENCE (>80%): Item is specific and clearly identifiable
- Return ONE detailed suggestion with exact name, typical quantity, shelf life
- Example: "eggs" → "Large white eggs, dozen, 21-28 days"

MEDIUM CONFIDENCE (40-80%): Item is recognizable but vague/ambiguous  
- Return 3-4 common specific variations
- Include brand examples and common sizes
- Encourage user to be more specific
- Example: "chocolate" → ["Milk chocolate bar 1.5oz", "Dark chocolate chips 12oz", "Chocolate candy assorted 8oz"]

LOW CONFIDENCE (<40%): Item is too vague, unclear, or non-food
- Provide guidance on being more specific
- Give examples of better alternatives
- Suggest photo upload for unclear items
- Example: "stuff" → guidance to be more specific

Focus on:
- Common grocery items and typical household sizes
- Realistic shelf life estimates (in days)
- Encouraging specificity over generic terms
- Educational guidance for better entries

Return JSON format:
{
  "confidence": 0.0-1.0,
  "action": "accept" | "choose" | "specify",
  "suggestions": [
    {
      "name": "Specific item name",
      "quantity": "Amount with unit",
      "shelfLife": "X days",
      "location": "pantry" | "fridge" | "freezer",
      "daysUntilExpiry": number
    }
  ],
  "guidance": {
    "message": "Helpful message",
    "examples": ["example1", "example2"],
    "reasoning": "Why this confidence level"
  }
}`;

    const genAI = initializeGemini();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let suggestionData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/s);
      if (jsonMatch) {
        suggestionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', text);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    res.json(suggestionData);

  } catch (error) {
    console.error('Error in suggest-item:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions', 
      details: error.message 
    });
  }
}