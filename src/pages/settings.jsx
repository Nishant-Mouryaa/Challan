import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../components/Layout/MainLayout';
import styles from '../styles/form.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';

const initialForms = {
  clients: {
    name: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    contactNo: '',
    email: '',
  },
  senders: {
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
  products: { code: '', name: '', category: '', price: '' },
};

const formConfig = {
  clients: {
    title: 'Clients',
    endpoint: '/api/clients',
    required: ['name', 'address'],
    fields: ['name', 'address', 'city', 'state', 'pin', 'contactNo', 'email'],
    display: (record) => record.name,
  },
  senders: {
    title: 'Senders',
    endpoint: '/api/senders',
    required: ['company', 'address'],
    fields: ['company', 'careOf', 'address', 'area', 'city', 'pin', 'state', 'contactNo', 'email'],
    display: (record) => record.company,
  },
  products: {
    title: 'Products',
    endpoint: '/api/products',
    required: ['code', 'name', 'price'],
    fields: ['code', 'name', 'category', 'price'],
    display: (record) => `${record.code} - ${record.name}`,
  },
};

const fieldLabel = (field) =>
  field === 'contactNo'
    ? 'Contact number'
    : field.charAt(0).toUpperCase() + field.slice(1);

export default function SettingsPage() {
  const [records, setRecords] = useState({ clients: [], senders: [], products: [] });
  const [forms, setForms] = useState(initialForms);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all(
      Object.entries(formConfig).map(async ([key, config]) => {
        const response = await authenticatedFetch(config.endpoint);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Unable to load ${config.title.toLowerCase()}`);
        return [key, result];
      })
    )
      .then((entries) => {
        if (active) setRecords(Object.fromEntries(entries));
      })
      .catch((loadError) => {
        console.error('Unable to load business settings:', loadError);
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateForm = (key, field, value) => {
    setForms((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  };

  const handleSubmit = async (key, event) => {
    event.preventDefault();
    setSaving(key);
    setError('');
    setSuccess('');

    try {
      const config = formConfig[key];
      const body = {
        ...forms[key],
        ...(key === 'products' ? { price: Number(forms[key].price) } : {}),
      };
      const response = await authenticatedFetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Unable to save ${config.title.toLowerCase()}`);

      setRecords((current) => ({
        ...current,
        [key]: [...current[key], result],
      }));
      setForms((current) => ({ ...current, [key]: initialForms[key] }));
      setSuccess(`${config.title.slice(0, -1)} added.`);
    } catch (saveError) {
      console.error(`Unable to save ${key}:`, saveError);
      setError(saveError.message || `Unable to save ${key}`);
    } finally {
      setSaving('');
    }
  };

  return (
    <>
      <Head><title>Business setup - DC System</title></Head>
      <MainLayout>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h1>Business setup</h1>
            <p>Manage the clients, sender addresses, and products in this workspace.</p>
          </div>
          {error && <div className={styles.error} role="alert">{error}</div>}
          {success && <div className={styles.success} role="status">{success}</div>}
          {loading ? (
            <div className={styles.loading}>Loading business settings...</div>
          ) : (
            Object.entries(formConfig).map(([key, config]) => (
              <fieldset className={styles.fieldset} key={key}>
                <legend className={styles.legend}>{config.title}</legend>
                <form onSubmit={(event) => handleSubmit(key, event)}>
                  <div className={styles.formRow}>
                    {config.fields.map((field) => (
                      <div className={styles.formControl} key={field}>
                        <label htmlFor={`${key}-${field}`}>{fieldLabel(field)}</label>
                        {field === 'address' ? (
                          <textarea
                            id={`${key}-${field}`}
                            required={config.required.includes(field)}
                            value={forms[key][field]}
                            onChange={(event) => updateForm(key, field, event.target.value)}
                          />
                        ) : (
                          <input
                            id={`${key}-${field}`}
                            type={field === 'price' ? 'number' : field === 'email' ? 'email' : 'text'}
                            step={field === 'price' ? '0.01' : undefined}
                            min={field === 'price' ? '0' : undefined}
                            required={config.required.includes(field)}
                            value={forms[key][field]}
                            onChange={(event) => updateForm(key, field, event.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving === key}>
                    {saving === key ? 'Saving...' : `Add ${config.title.slice(0, -1)}`}
                  </button>
                </form>
                <ul>
                  {records[key].map((record) => (
                    <li key={record.id}>{config.display(record)}</li>
                  ))}
                </ul>
              </fieldset>
            ))
          )}
        </div>
      </MainLayout>
    </>
  );
}
