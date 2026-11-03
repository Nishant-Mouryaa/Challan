import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import MisReportPanel from '../components/MisReportPanel';

import MainLayout from '../components/Layout/MainLayout';

import { authenticatedFetch } from '../lib/supabaseClient';

import s from '../styles/mis.module.css';

async function requestJson(url, options = {}) {
  const response = await authenticatedFetch(url, options);

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error('The server returned an unexpected response.');
  }

  if (!response.ok) {
    throw new Error(
      result.error || 'The request could not be completed.'
    );
  }

  return result;
}

const jsonOptions = (body) => ({
  method: 'POST',

  headers: {
    'Content-Type': 'application/json',
  },

  body: JSON.stringify(body),
});

async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }

  return btoa(binary);
}

const COUNT_LABELS = {
  inserted: 'New shipments',
  updated: 'Updated',
  unchanged: 'Unchanged',
  older: 'Older events',
  conflicts: 'Needs review',
  invalid: 'Invalid rows',
  unmappedClients: 'Unmapped clients',
};

export default function DtdcMisPage() {
  const fileInputRef = useRef(null);

  const [sourceType, setSourceType] = useState('pudo');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const [clients, setClients] = useState([]);
  const [clientName, setClientName] = useState('');
  const [reportRefreshToken, setReportRefreshToken] = useState(0);

  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadClients = async () => {
    const allClients = [];

    let page = 1;
    let totalPages = 1;

    do {
      const data = await requestJson(
        `/api/mis/clients?page=${page}&pageSize=200`
      );

      allClients.push(...data.clients);
      totalPages = data.pagination.totalPages;
      page += 1;
    } while (page <= totalPages);

    setClients(allClients);
  };

  useEffect(() => {
    loadClients().catch((loadError) =>
      setError(loadError.message)
    );
  }, []);

  const clearPreview = () => {
    setResult(null);
    setError('');
    setNotice('');
  };

  const runImport = async (preview) => {
    if (!file || busy) return;

    setBusy(preview ? 'preview' : 'import');
    setError('');
    setNotice('');

    try {
      const isExcel = file.name.toLowerCase().endsWith('.xlsx');
      const fileContent = isExcel
        ? { excelBase64: await fileToBase64(file) }
        : { csvText: await file.text() };

      const data = await requestJson(
        '/api/mis/imports',
        jsonOptions({
          sourceType,
          fileName: file.name,
          ...fileContent,
          preview,
        })
      );

      setResult(data);

      if (!preview) {
        setReportRefreshToken((previous) => previous + 1);
        setNotice(
          'Import completed. Valid records were processed; conflicts were not overwritten.'
        );

        try {
          await loadClients();
        } catch (refreshError) {
          setError(
            `Import completed, but the client list could not be refreshed: ${refreshError.message}`
          );
        }
      }
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
    } finally {
      setBusy('');
    }
  };

  const createClient = async (event) => {
    event.preventDefault();

    if (!clientName.trim() || busy) return;

    setBusy('client');
    setError('');
    setNotice('');

    try {
      await requestJson(
        '/api/mis/clients',
        jsonOptions({
          name: clientName.trim(),
        })
      );

      setClientName('');
      await loadClients();

      setNotice('Client created. You can now map its PUDO customer name.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy('');
    }
  };

  const importable =
    result?.preview &&
    result.validConsignments > 0;

  return (
    <>
      <Head>
        <title>DTDC MIS — DC System</title>
      </Head>

      <MainLayout>
        <div className={s.page}>
          <header className={s.header}>
            <div>
              <div className={s.eyebrow}>
                CLIENT SHIPMENT REPORTING
              </div>

              <h1>DTDC MIS</h1>

              <p>
                Import bookings, update tracking, and organize
                shipments by client.
              </p>
            </div>

            <span className={s.badge}>
              Shared workspace
            </span>
          </header>

          {error && (
            <div className={s.error} role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className={s.success} role="status">
              {notice}
            </div>
          )}

          <div className={s.columns}>
            {/* ================= IMPORT ================= */}

            <section className={s.card}>
              <div className={s.cardHeader}>
                <h2>1. Import shipment data</h2>

                <p>
                  PUDO supplies booking and client details.
                  Workspace supplies tracking updates.
                </p>
              </div>

              <div className={s.body}>
                <label className={s.field}>
                  <span>Report source</span>

                  <select
                    value={sourceType}
                    disabled={Boolean(busy)}
                    onChange={(event) => {
                      setSourceType(event.target.value);
                      setFile(null);
                      clearPreview();

                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <option value="pudo">
                      PUDO — bookings and customers
                    </option>

                    <option value="workspace">
                      Workspace — tracking statuses
                    </option>
                  </select>
                </label>

                <label className={s.upload}>
                  <strong>
                    Select a{' '}
                    {sourceType === 'workspace'
                      ? 'CSV or Excel report'
                      : 'CSV report'}
                  </strong>

                  <span>
                    {sourceType === 'workspace'
                      ? 'Workspace accepts CSV or .xlsx files.'
                      : 'PUDO accepts CSV files.'}{' '}
                    Maximum 1 MB and 3,000 rows per file.
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      sourceType === 'workspace'
                        ? '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        : '.csv,text/csv'
                    }
                    disabled={Boolean(busy)}
                    onChange={(event) => {
                      clearPreview();

                      const selected =
                        event.target.files?.[0] || null;

                      const isExcel =
                        selected?.name
                          .toLowerCase()
                          .endsWith('.xlsx');
                      const supportedFile =
                        selected &&
                        (selected.name
                          .toLowerCase()
                          .endsWith('.csv') ||
                          (sourceType === 'workspace' && isExcel));

                      if (selected && !supportedFile) {
                        setError(
                          sourceType === 'workspace'
                            ? 'Please select a CSV or .xlsx file.'
                            : 'Please select a CSV file.'
                        );
                        setFile(null);
                        event.target.value = '';
                        return;
                      }

                      if (
                        selected &&
                        selected.size > 1024 * 1024
                      ) {
                        setError(
                          'Please select a file smaller than 1 MB.'
                        );
                        setFile(null);
                        event.target.value = '';
                        return;
                      }

                      setFile(selected);
                    }}
                  />
                </label>

                {file && (
                  <p className={s.help}>
                    Selected: <strong>{file.name}</strong>
                  </p>
                )}

                <div className={s.actions}>
                  <button
                    type="button"
                    className={s.secondary}
                    disabled={!file || Boolean(busy)}
                    onClick={() => runImport(true)}
                  >
                    {busy === 'preview'
                      ? 'Checking file…'
                      : 'Preview import'}
                  </button>

                  <button
                    type="button"
                    className={s.primary}
                    disabled={
                      !importable || Boolean(busy)
                    }
                    onClick={() => runImport(false)}
                  >
                    {busy === 'import'
                      ? 'Importing…'
                      : 'Confirm import'}
                  </button>
                </div>

                <p className={s.help}>
                  Preview does not save shipments.
                  Confirmation processes valid rows and skips
                  conflicting or invalid records.
                </p>
              </div>
            </section>

            {/* ================= CLIENT CREATION ================= */}

            <section className={s.card}>
              <div className={s.cardHeader}>
                <h2>2. Reporting clients</h2>

                <p>
                  Create separate accounts such as Janvi
                  Fedbank and Fedbank Direct.
                </p>
              </div>

              <form className={s.body} onSubmit={createClient}>
                <label className={s.field}>
                  <span>Client display name</span>

                  <input
                    type="text"
                    value={clientName}
                    maxLength={160}
                    placeholder="e.g. Janvi Fedbank"
                    required
                    disabled={Boolean(busy)}
                    onChange={(event) =>
                      setClientName(event.target.value)
                    }
                  />
                </label>

                <button
                  type="submit"
                  className={s.secondary}
                  disabled={
                    !clientName.trim() || Boolean(busy)
                  }
                >
                  {busy === 'client'
                    ? 'Creating…'
                    : 'Create client'}
                </button>

                <div className={s.clientList}>
                  {clients.map((client) => (
                    <span
                      key={client.id}
                      className={s.badge}
                    >
                      {client.name}
                    </span>
                  ))}
                </div>

                {!clients.length && (
                  <p className={s.help}>
                    No reporting clients created yet.
                  </p>
                )}
              </form>
            </section>
          </div>

          {/* ================= PREVIEW RESULTS ================= */}

          {result && (
            <section className={s.card}>
              <div className={s.cardHeader}>
                <h2>
                  {result.preview
                    ? 'Import preview'
                    : 'Import result'}
                </h2>

                <p>
                  {result.totalRows} source rows ·{' '}
                  {result.validConsignments} valid unique
                  consignments ·{' '}
                  {result.duplicatesCollapsed} duplicate rows
                  consolidated
                </p>
              </div>

              <div className={s.body}>
                <div className={s.stats}>
                  {Object.entries(COUNT_LABELS).map(
                    ([key, label]) => (
                      <div key={key}>
                        <span>{label}</span>
                        <strong>
                          {result.counts?.[key] || 0}
                        </strong>
                      </div>
                    )
                  )}
                </div>

                <p className={s.help}>
                  “Unmapped clients” counts booking records
                  without an approved customer mapping; it is
                  not an additional import outcome.
                </p>

                {/* Customer names resolved on confirmation */}
                {result.missingClients?.length > 0 && (
                  <div className={s.section}>
                    <h3>Customer names to map automatically</h3>

                    <p className={s.help}>
                      On confirmation, each name will use an
                      existing reporting client with the same
                      normalized name, or create a client using
                      the PUDO customer name and save its mapping.
                      Preview does not create clients or mappings.
                    </p>

                    <ul>
                      {result.missingClients.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parser issues */}
                {result.issues?.length > 0 && (
                  <div className={s.section}>
                    <h3>Source-file issues</h3>

                    <ul className={s.issueList}>
                      {result.issues.map((issue, index) => (
                        <li key={index}>
                          Row {issue.row}
                          {issue.consignmentNo
                            ? ` · ${issue.consignmentNo}`
                            : ''}
                          : {issue.message}
                        </li>
                      ))}
                    </ul>

                    <p className={s.help}>
                      Up to 100 source-file issues are shown.
                    </p>
                  </div>
                )}

                {/* Per-consignment outcomes */}
                <div className={s.section}>
                  <h3>Shipment outcomes</h3>

                  <div className={s.tableWrapper}>
                    <table className={s.table}>
                      <thead>
                        <tr>
                          <th scope="col">
                            Consignment
                          </th>
                          <th scope="col">Result</th>
                          <th scope="col">Details</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.details?.map((item) => (
                          <tr key={item.consignmentNo}>
                            <td>
                              <strong>
                                {item.consignmentNo}
                              </strong>
                            </td>

                            <td>
                              <span className={s.badge}>
                                {item.action}
                              </span>
                            </td>

                            <td>
                              {item.reason || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {result.detailsTruncated && (
                    <p className={s.help}>
                      Showing the first 100 shipment
                      outcomes. Counts cover the complete
                      file.
                    </p>
                  )}
                </div>
              </div>
            </section>
            
          )}
           <MisReportPanel
          clients={clients}
          requestJson={requestJson}
             refreshToken={reportRefreshToken}
           />
        </div>
      </MainLayout>
    </>
  );
}