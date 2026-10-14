/**
 * Validation utilities
 */

export const validatePIN = (pin) => {
  return /^\d{6}$/.test(pin);
};

export const validateContactNo = (contactNo) => {
  return /^[0-9]{10}$|^\+[0-9]{1,3}[0-9]{7,}$/.test(contactNo?.replace(/[-\s]/g, ''));
};

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateChallanForm = (data) => {
  const errors = {};

  if (!data.receiverDetails?.name?.trim()) {
    errors.receiverName = 'Receiver name is required';
  }

  if (!data.receiverDetails?.address?.trim()) {
    errors.receiverAddress = 'Receiver address is required';
  }

  if (!data.receiverDetails?.pin || !validatePIN(data.receiverDetails.pin)) {
    errors.receiverPin = 'Valid 6-digit PIN is required';
  }

  if (data.items?.length === 0) {
    errors.items = 'At least one item is required';
  }

  data.items?.forEach((item, index) => {
    if (!item.description?.trim()) {
      errors[`item_${index}_description`] = 'Item description is required';
    }
    if (item.quantity <= 0) {
      errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
    }
    if (item.price <= 0) {
      errors[`item_${index}_price`] = 'Price must be greater than 0';
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};