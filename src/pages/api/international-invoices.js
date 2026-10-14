import { promises as fs } from 'fs';
import path from 'path';

async function getInvoices() {
  try {
    const fileContents = await fs.readFile(
      path.join(process.cwd(), 'public', 'data', 'internationalInvoices.json'),
      'utf8'
    );
    const data = JSON.parse(fileContents);
    return data.invoices || [];
  } catch (error) {
    return [];
  }
}

async function saveInvoices(invoices) {
  await fs.writeFile(
    path.join(process.cwd(), 'public', 'data', 'internationalInvoices.json'),
    JSON.stringify({ invoices }, null, 2),
    'utf8'
  );
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const invoices = await getInvoices();
      res.status(200).json(invoices);
    } catch (error) {
      console.error('Error reading invoices:', error);
      res.status(500).json({ error: 'Failed to load invoices' });
    }
  } else if (req.method === 'POST') {
    try {
      const { invoiceNo, invoiceDate, consignorDetails, consigneeDetails, items, totalAmount } = req.body;

      if (!invoiceNo || !consigneeDetails?.name || !items?.length) {
        return res.status(400).json({
          error: 'Missing required fields',
        });
      }

      const invoices = await getInvoices();
      const newInvoice = {
        id: Date.now(),
        invoiceNo,
        invoiceDate,
        consignorDetails,
        consigneeDetails,
        items,
        totalAmount,
        createdAt: new Date().toISOString(),
      };

      invoices.push(newInvoice);
      await saveInvoices(invoices);

      res.status(201).json(newInvoice);
    } catch (error) {
      console.error('Error saving invoice:', error);
      res.status(500).json({ error: 'Failed to save invoice' });
    }
  } else if (req.method === 'PUT') {
    // Update invoice
    try {
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      const invoiceId = parseInt(id);
      const updatedData = req.body;
      const invoices = await getInvoices();

      const index = invoices.findIndex((inv) => inv.id === invoiceId);
      if (index === -1) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      invoices[index] = {
        ...invoices[index],
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };

      await saveInvoices(invoices);
      res.status(200).json(invoices[index]);
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  } else if (req.method === 'DELETE') {
    // Delete invoice
    try {
      if (!id) {
        return res.status(400).json({ error: 'Invoice ID is required' });
      }

      const invoiceId = parseInt(id);
      const invoices = await getInvoices();
      const filteredInvoices = invoices.filter((inv) => inv.id !== invoiceId);

      if (filteredInvoices.length === invoices.length) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      await saveInvoices(filteredInvoices);
      res.status(200).json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}