import { promises as fs } from 'fs';
import path from 'path';

// File-based storage
const CHALLANS_FILE = path.join(process.cwd(), 'public', 'data', 'challans.json');

async function getChallans() {
  try {
    const fileContents = await fs.readFile(CHALLANS_FILE, 'utf8');
    const data = JSON.parse(fileContents);
    return data.challans || [];
  } catch (error) {
    // File doesn't exist yet
    return [];
  }
}

async function saveChallans(challans) {
  await fs.writeFile(
    CHALLANS_FILE,
    JSON.stringify({ challans }, null, 2),
    'utf8'
  );
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const challans = await getChallans();
      res.status(200).json(challans);
    } catch (error) {
      console.error('Error reading challans:', error);
      res.status(500).json({ error: 'Failed to load challans' });
    }
  } else if (req.method === 'POST') {
    try {
      const { challanNo, date, senderId, receiverDetails, items } = req.body;

      if (!challanNo || !receiverDetails?.name || !items?.length) {
        return res.status(400).json({
          error: 'Missing required fields',
        });
      }

      const challans = await getChallans();
      const newChallan = {
        id: Date.now(),
        challanNo,
        date,
        senderId,
        receiverDetails,
        items,
        createdAt: new Date().toISOString(),
      };

      challans.push(newChallan);
      await saveChallans(challans);

      res.status(201).json(newChallan);
    } catch (error) {
      console.error('Error saving challan:', error);
      res.status(500).json({ error: 'Failed to save challan' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const challans = await getChallans();
      const filtered = challans.filter((c) => c.id !== parseInt(id));

      if (filtered.length === challans.length) {
        return res.status(404).json({ error: 'Challan not found' });
      }

      await saveChallans(filtered);
      res.status(200).json({ message: 'Challan deleted' });
    } catch (error) {
      console.error('Error deleting challan:', error);
      res.status(500).json({ error: 'Failed to delete challan' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}