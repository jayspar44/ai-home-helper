// GET /api/health
const { handleCors } = require('../utils/cors');

export default function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({ status: 'OK' });
}