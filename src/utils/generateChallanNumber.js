import { authenticatedFetch } from '../lib/supabaseClient';

/**
 * Generate unique challan numbers
 * Format: DC-YYYYMMDD-XXXX
 * Example: DC-20260929-0001
 */

export const generateChallanNumber = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate random 4-digit number
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  
  return `DC-${dateStr}-${random}`;
};

// Alternative: Sequential numbering (requires database)
export const getNextChallanNumber = async (prefix = 'DC') => {
  try {
    const response = await authenticatedFetch('/api/challans/next-number');
    if (!response.ok) throw new Error('Failed to get next challan number');
    const { number } = await response.json();
    return number;
  } catch (error) {
    console.error('Error getting next challan number:', error);
    return generateChallanNumber();
  }
};