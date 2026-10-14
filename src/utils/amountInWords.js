/**
 * Convert amount in rupees to words
 * Example: 47200 -> "Rupees Forty Seven Thousand Two Hundred Only"
 */

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
];

const teens = [
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const scales = ['', 'Thousand', 'Lakh', 'Crore'];

const convertTwoDigits = (num) => {
  if (num === 0) return '';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
};

const convertThreeDigits = (num) => {
  let result = '';
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred';
    num %= 100;
    if (num !== 0) result += ' ' + convertTwoDigits(num);
  } else {
    result = convertTwoDigits(num);
  }
  return result;
};

export const convertAmountToWords = (amount) => {
  if (amount === 0) return 'Zero';
  if (amount < 0) return 'Negative ' + convertAmountToWords(Math.abs(amount));

  const parts = [];
  let scaleIndex = 0;

  while (amount > 0 && scaleIndex < scales.length) {
    const part = amount % 1000;
    if (part !== 0) {
      const partWords = convertThreeDigits(part);
      if (scales[scaleIndex]) {
        parts.unshift(partWords + ' ' + scales[scaleIndex]);
      } else {
        parts.unshift(partWords);
      }
    }
    amount = Math.floor(amount / 1000);
    scaleIndex++;
  }

  return 'Rupees ' + parts.join(' ').trim();
};

// Test
// console.log(convertAmountToWords(47200)); // Rupees Forty Seven Thousand Two Hundred