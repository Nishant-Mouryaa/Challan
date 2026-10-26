import { useState, useCallback } from 'react';
import { generateChallanNumber } from '../utils/generateChallanNumber';
import { convertAmountToWords } from '../utils/amountInWords';
import { authenticatedFetch } from '../lib/supabaseClient';

export const useChallan = (initialData = null) => {
  const [challanData, setChallanData] = useState(
    initialData || {
      challanNo: generateChallanNumber(),
      date: new Date().toISOString().split('T')[0],
      senderId: 1,
      senderDetails: {
        company: '',
        careOf: '',
        address: '',
        area: '',
        city: '',
        pin: '',
        state: '',
        contactNo: '',
        email: '',
      },
      receiverDetails: {
        clientId: null,
        name: '',
        address: '',
        city: '',
        state: '',
        pin: '',
        contactNo: '',
        email: '',
      },
      items: [
        {
          sNo: 1,
          description: '',
          quantity: 1,
          price: 0,
        },
      ],
    }
  );

  const [savedChallans, setSavedChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateTotal = useCallback((items) => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }, []);

  const saveChallan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(
        initialData?.id ? `/api/challans/${initialData.id}` : '/api/challans',
        {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(challanData),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save challan');

      const savedData = result;
      setSavedChallans((prev) => [savedData, ...prev]);
      return savedData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [challanData, initialData]);

  const updateChallanData = useCallback((updates) => {
    setChallanData((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const updateSenderDetails = useCallback((updates) => {
    setChallanData((prev) => ({
      ...prev,
      senderDetails: {
        ...prev.senderDetails,
        ...updates,
      },
    }));
  }, []);

  const updateReceiverDetails = useCallback((updates) => {
    setChallanData((prev) => ({
      ...prev,
      receiverDetails: {
        ...prev.receiverDetails,
        ...updates,
      },
    }));
  }, []);

  const addItem = useCallback(() => {
    setChallanData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sNo: prev.items.length + 1,
          description: '',
          quantity: 1,
          price: 0,
        },
      ],
    }));
  }, []);

  const removeItem = useCallback((index) => {
    setChallanData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const updateItem = useCallback((index, updates) => {
    setChallanData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  const resetForm = useCallback(() => {
    setChallanData({
      challanNo: generateChallanNumber(),
      date: new Date().toISOString().split('T')[0],
      senderId: 1,
      senderDetails: {
        company: '',
        careOf: '',
        address: '',
        area: '',
        city: '',
        pin: '',
        state: '',
        contactNo: '',
        email: '',
      },
      receiverDetails: {
        clientId: null,
        name: '',
        address: '',
        city: '',
        state: '',
        pin: '',
        contactNo: '',
        email: '',
      },
      items: [
        {
          sNo: 1,
          description: '',
          quantity: 1,
          price: 0,
        },
      ],
    });
  }, []);

  const getAmountInWords = useCallback(() => {
    const total = calculateTotal(challanData.items);
    return convertAmountToWords(Math.round(total));
  }, [challanData.items, calculateTotal]);

  const getTotalAmount = useCallback(() => {
    return calculateTotal(challanData.items);
  }, [challanData.items, calculateTotal]);

  return {
    challanData,
    savedChallans,
    loading,
    error,
    setChallanData,
    updateChallanData,
    updateSenderDetails,
    updateReceiverDetails,
    addItem,
    removeItem,
    updateItem,
    saveChallan,
    resetForm,
    calculateTotal,
    getAmountInWords,
    getTotalAmount,
  };
};