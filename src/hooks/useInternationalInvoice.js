import { useState, useCallback } from 'react';
import { convertAmountToWords } from '../utils/amountInWords';
import { buildInitialInvoice, EMPTY_ITEM } from '../data/internationalInvoicePresets';

const calculateTotal = (items) =>
  items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

export const useInternationalInvoice = (initialData = null) => {
  const [invoiceData, setInvoiceData] = useState(
    () => initialData || buildInitialInvoice()
  );
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/international-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      if (!response.ok) throw new Error('Failed to save invoice');

      const savedData = await response.json();
      setSavedInvoices((prev) => [savedData, ...prev]);
      return savedData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invoiceData]);

  const updateInvoiceData = useCallback((updates) => {
    setInvoiceData((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateConsignorDetails = useCallback((updates) => {
    setInvoiceData((prev) => ({
      ...prev,
      consignorDetails: { ...prev.consignorDetails, ...updates },
    }));
  }, []);

  const updateConsigneeDetails = useCallback((updates) => {
    setInvoiceData((prev) => ({
      ...prev,
      consigneeDetails: { ...prev.consigneeDetails, ...updates },
    }));
  }, []);

  const addItem = useCallback(() => {
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  }, []);

  const removeItem = useCallback((index) => {
    setInvoiceData((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items, totalAmount: calculateTotal(items) };
    });
  }, []);

  const updateItem = useCallback((index, updates) => {
    setInvoiceData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...updates };

      if (updates.quantity !== undefined || updates.ratePerPiece !== undefined) {
        items[index].amount =
          (Number(items[index].quantity) || 0) * (Number(items[index].ratePerPiece) || 0);
      }

      return { ...prev, items, totalAmount: calculateTotal(items) };
    });
  }, []);

  const resetForm = useCallback(() => {
    setInvoiceData(buildInitialInvoice());
  }, []);

  const getTotalAmount = useCallback(
    () => calculateTotal(invoiceData.items),
    [invoiceData.items]
  );

  const getAmountInWords = useCallback(
    (amount) => convertAmountToWords(Math.round(amount)),
    []
  );

  return {
    invoiceData,
    savedInvoices,
    loading,
    error,
    updateInvoiceData,
    updateConsignorDetails,
    updateConsigneeDetails,
    addItem,
    removeItem,
    updateItem,
    saveInvoice,
    resetForm,
    getTotalAmount,
    getAmountInWords,
  };
};