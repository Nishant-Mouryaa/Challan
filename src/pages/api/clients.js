import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'clients.json');
      const fileContents = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContents);
      
      res.status(200).json(data.clients || data);
    } catch (error) {
      console.error('Error reading clients:', error);
      res.status(500).json({ error: 'Failed to load clients' });
    }
  } else if (req.method === 'POST') {
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'clients.json');
      const fileContents = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContents);
      
      const newClient = {
        id: Math.max(...data.clients.map((c) => c.id), 0) + 1,
        ...req.body,
      };
      
      data.clients.push(newClient);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      res.status(201).json(newClient);
    } catch (error) {
      console.error('Error saving client:', error);
      res.status(500).json({ error: 'Failed to save client' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}