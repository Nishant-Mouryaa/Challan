import { useState, useCallback } from 'react';
import { convertAmountToWords } from '../utils/amountInWords';
import { buildInitialInvoice, EMPTY_ITEM } from '../data/internationalInvoicePresets';
import {
  MODES,
  COURIER_PURPOSES,
  getMode,
  isAutoNote,
  buildItemDetails,
} from '../data/invoiceModes';

const calculateTotal = (items) =>
  items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

/** Pure helper: switch an invoice object to a mode, keeping anything the user typed. */
const withMode = (data, modeId) => {
  const mode = getMode(modeId);
  const next = {
    ...data,
    mode: mode.id,
    modeDetails: { ...mode.detailDefaults, ...(data.modeDetails || {}) },
    items: (data.items || []).map((it) => ({
      ...it,
      details: buildItemDetails(it, mode.id),
    })),
  };

  if (isAutoNote(data.shipmentNotes)) {
    const purpose = next.modeDetails.purpose;
    next.shipmentNotes =
      mode.id === 'courier' && COURIER_PURPOSES[purpose]
        ? COURIER_PURPOSES[purpose].note
        : mode.defaults.shipmentNotes;
  }
  return next;
};

export const useInternationalInvoice = (initialData = null) => {
  const [invoiceData, setInvoiceData] = useState(() =>
    initialData
      ? { mode: 'courier', modeDetails: {}, ...initialData }
      : withMode(buildInitialInvoice(), 'courier')
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

  /** Pick a mode: fills sensible defaults without overwriting what was typed. */
  const applyMode = useCallback((modeId) => {
    if (!MODES[modeId]) return;
    setInvoiceData((prev) => withMode(prev, modeId));
  }, []);

  /** Edit mode-specific fields (purpose, patient name, battery, incoterms...). */
  const updateModeDetails = useCallback((updates) => {
    setInvoiceData((prev) => {
      const next = {
        ...prev,
        modeDetails: { ...(prev.modeDetails || {}), ...updates },
      };
      // courier purpose drives the invoice note, unless the user edited it
      if (
        prev.mode === 'courier' &&
        updates.purpose &&
        COURIER_PURPOSES[updates.purpose] &&
        isAutoNote(prev.shipmentNotes)
      ) {
        next.shipmentNotes = COURIER_PURPOSES[updates.purpose].note;
      }
      return next;
    });
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

      items[index].details = buildItemDetails(items[index], prev.mode);

      return { ...prev, items, totalAmount: calculateTotal(items) };
    });
  }, []);

  // keeps the current mode after a reset
  const resetForm = useCallback(() => {
    setInvoiceData((prev) => withMode(buildInitialInvoice(), prev.mode || 'courier'));
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
    applyMode,
    updateModeDetails,
    addItem,
    removeItem,
    updateItem,
    saveInvoice,
    resetForm,
    getTotalAmount,
    getAmountInWords,
  };
};