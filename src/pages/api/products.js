import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Read the JSON file
      const filePath = path.join(process.cwd(), 'public', 'data', 'products.json');
      const fileContents = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContents);
      
      res.status(200).json(data.products || data);
    } catch (error) {
      console.error('Error reading products:', error);
      res.status(500).json({ error: 'Failed to load products' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}