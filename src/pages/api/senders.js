import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'senders.json');
      const fileContents = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContents);
      
      console.log('Senders API - Returning:', data.senders); // Debug log
      
      res.status(200).json(data.senders || data);
    } catch (error) {
      console.error('Error reading senders:', error);
      res.status(500).json({ 
        error: 'Failed to load senders',
        details: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}