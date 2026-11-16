import React, { useEffect, useState } from 'react';
import s from '../styles/mis.module.css';
import { authenticatedFetch } from '../lib/supabaseClient';
import MIS_EXPORT_COLUMNS from '../lib/misExportColumns';

const PAGE_SIZE = 50;

const DEFAULT_EXPORT_COLUMN_KEYS = MIS_EXPORT_COLUMNS
  .filter((column) => column.defaultSelected)
  .map((column) => column.key);

function buildShipmentParams(query, page, pageSize) {
  const params = new URLSearchParams({
    clientId: query.clientId,
    from: query.from,
    to: query.to,
    page: String(page),
    pageSize: String(pageSize),
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    deliveryStatus: query.deliveryStatus,

    // Matches the existing endpoint's parent-only reporting.
    includeChildren: 'false',
  });

  if (query.search) {
    params.set('q', query.search);
  }

  return params;
}

function formatReportDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export default function MisReportPanel({
  clients,
  requestJson,
  refreshToken,
}) {
  const [clientId, setClientId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [consignmentSearch, setConsignmentSearch] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('all');
  const [exportColumnKeys, setExportColumnKeys] = useState(
    DEFAULT_EXPORT_COLUMN_KEYS
  );

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [downloadNotice, setDownloadNotice] = useState('');
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copyNotice, setCopyNotice] = useState('');

  // The submitted filters are kept separate from editable inputs.
  const [query, setQuery] = useState(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [requestError, setRequestError] = useState('');

  // Load the report whenever submitted filters change.
  useEffect(() => {
    if (!query) return undefined;

    let ignore = false;

    async function loadReport() {
      setLoading(true);
      setRequestError('');
      setReport(null);

      try {
        const params = buildShipmentParams(
          query,
          query.page,
          PAGE_SIZE
        );

        const data = await requestJson(
          `/api/mis/shipments?${params.toString()}`
        );

        if (
          !Array.isArray(data.shipments) ||
          !data.pagination
        ) {
          throw new Error(
            'The shipment API returned an unexpected report format.'
          );
        }

        if (!ignore) {
          setReport(data);
        }
      } catch (error) {
        if (!ignore) {
          setRequestError(
            error.message || 'The report could not be loaded.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      ignore = true;
    };
  }, [query, requestJson, refreshToken]);

  // Download the displayed report as an Excel file.
  // NOTE: This must live OUTSIDE useEffect so the button's
  // onClick handler can reference it during render.
  async function downloadExcel() {
    if (
      !query ||
      !report ||
      loading ||
      downloading ||
      copying ||
      !report.pagination?.total
    ) {
      return;
    }

    // Capture the filters used by the displayed preview.
    const exportQuery = {
      clientId: query.clientId,
      from: query.from,
      to: query.to,
      fields: exportColumnKeys.join(','),
      deliveryStatus: query.deliveryStatus,
    };

    if (query.search) {
      exportQuery.q = query.search;
    }

    setDownloading(true);
    setDownloadError('');
    setDownloadNotice('');

    try {
      const params = new URLSearchParams(exportQuery);

      // Do not use requestJson here: success returns an Excel file.
      const response = await authenticatedFetch(
        `/api/mis/export?${params.toString()}`
      );

      if (!response.ok) {
        const responseText = await response.text();

        let message =
          `Excel download failed with HTTP ${response.status}.`;

        try {
          const errorData = JSON.parse(responseText);

          if (typeof errorData?.error === 'string') {
            message = errorData.error;
          }
        } catch {
          // Keep the status-based message for non-JSON errors.
        }

        throw new Error(message);
      }

      const contentType =
        response.headers.get('content-type') || '';

      if (
        !contentType.includes(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ) {
        throw new Error(
          'The server did not return an Excel file. Check the export endpoint and server logs.'
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error(
          'The server returned an empty Excel file.'
        );
      }

      const disposition =
        response.headers.get('content-disposition') || '';

      const fileNameMatch = disposition.match(
        /filename="([^"]+)"/i
      );

      const fileName =
        fileNameMatch?.[1] ||
        `DTDC-MIS-${exportQuery.from}-to-${exportQuery.to}.xlsx`;

      const objectUrl = URL.createObjectURL(blob);

      try {
        const link = document.createElement('a');

        link.href = objectUrl;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        // Give the browser time to start the download.
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 60000);
      }

      setDownloadNotice(
        `Excel download started for the previewed ${
          exportQuery.clientId ? 'client' : 'all clients'
        } and date range.`
      );
    } catch (error) {
      setDownloadError(
        error.message || 'The Excel download failed.'
      );
    } finally {
      setDownloading(false);
    }
  }

  async function copyConsignmentNumbers() {
    if (
      !query ||
      !report ||
      loading ||
      downloading ||
      copying ||
      !report.pagination?.total
    ) {
      return;
    }

    setCopying(true);
    setCopyError('');
    setCopyNotice('');

    try {
      const firstPage = await requestJson(
        `/api/mis/shipments?${buildShipmentParams(
          query,
          1,
          200
        ).toString()}`
      );

      if (
        !Array.isArray(firstPage.shipments) ||
        !firstPage.pagination ||
        !Number.isInteger(firstPage.pagination.total) ||
        !Number.isInteger(firstPage.pagination.totalPages) ||
        firstPage.pagination.total < 1 ||
        firstPage.pagination.totalPages < 1
      ) {
        throw new Error(
          'The shipment API returned an unexpected report format.'
        );
      }

      const expectedTotal = firstPage.pagination.total;
      const totalPages = firstPage.pagination.totalPages;
      const allShipments = [...firstPage.shipments];

      for (let page = 2; page <= totalPages; page += 1) {
        const data = await requestJson(
          `/api/mis/shipments?${buildShipmentParams(
            query,
            page,
            200
          ).toString()}`
        );

        if (
          !Array.isArray(data.shipments) ||
          !data.pagination ||
          data.pagination.total !== expectedTotal ||
          data.pagination.totalPages !== totalPages
        ) {
          throw new Error(
            'The matching shipments changed while copying. Preview again and retry.'
          );
        }

        allShipments.push(...data.shipments);
      }

      if (allShipments.length !== expectedTotal) {
        throw new Error(
          'The matching shipments changed while copying. Preview again and retry.'
        );
      }

      const consignmentNumbers = allShipments.map(
        (shipment) => shipment.consignmentNo
      );

      if (
        consignmentNumbers.some(
          (number) =>
            typeof number !== 'string' || !number.trim()
        )
      ) {
        throw new Error(
          'One or more matching shipments are missing a consignment number.'
        );
      }

      if (!navigator.clipboard?.writeText) {
        throw new Error(
          'Clipboard access is unavailable. Use a secure browser connection and allow clipboard access.'
        );
      }

      await navigator.clipboard.writeText(
        consignmentNumbers
          .map((number) => number.trim())
          .join('\n')
      );

      setCopyNotice(
        `Copied ${consignmentNumbers.length} matching consignment numbers (${deliveryStatusLabel.toLowerCase()}) to the clipboard.`
      );
    } catch (error) {
      setCopyError(
        error.message || 'The consignment numbers could not be copied.'
      );
    } finally {
      setCopying(false);
    }
  }

  function handlePreview(event) {
    event.preventDefault();

    setDownloadError('');
    setDownloadNotice('');
    setCopyError('');
    setCopyNotice('');
    setValidationError('');

    if (!from || !to) {
      setValidationError(
        'Please select both the start date and end date.'
      );
      return;
    }

    if (from > to) {
      setValidationError(
        'Start date must not be after end date.'
      );
      return;
    }

    setReport(null);
    setRequestError('');
    setLoading(true);

    setQuery({
      clientId,
      from,
      to,
      search: consignmentSearch.trim(),
      deliveryStatus,
      page: 1,
      sortBy: 'bookingDate',
      sortDirection: 'desc',
    });
  }

  function changePage(nextPage) {
    if (!query || !report || loading) return;

    if (
      nextPage < 1 ||
      nextPage > report.pagination.totalPages
    ) {
      return;
    }

    setReport(null);
    setRequestError('');
    setLoading(true);

    setQuery((previous) => ({
      ...previous,
      page: nextPage,
    }));
  }

  function toggleExportColumn(key) {
    setExportColumnKeys((previous) =>
      previous.includes(key)
        ? previous.filter((columnKey) => columnKey !== key)
        : [...previous, key]
    );
  }

  function changeSort(column) {
    if (!query || !column || column.sortable === false || loading) {
      return;
    }

    const sortDirection =
      query.sortBy === column.key &&
      query.sortDirection === 'asc'
        ? 'desc'
        : 'asc';

    setReport(null);
    setRequestError('');
    setLoading(true);
    setQuery((previous) => ({
      ...previous,
      page: 1,
      sortBy: column.key,
      sortDirection,
    }));
  }

  function getShipmentValue(shipment, column) {
    if (column.key === 'clientName') {
      return (
        shipment.clientName ||
        shipment.senderName ||
        report?.client?.name
      );
    }

    if (column.key === 'status') {
      return shipment.status || 'Tracking unavailable';
    }

    if (
      column.key === 'deliveredDate' &&
      shipment.status !== 'Delivered'
    ) {
      return null;
    }

    return shipment[column.previewKey];
  }

  const shipments = report?.shipments || [];
  const pagination = report?.pagination;
  const total = pagination?.total || 0;

  const firstRow =
    total > 0
      ? (pagination.page - 1) * pagination.pageSize + 1
      : 0;

  const lastRow =
    total > 0
      ? firstRow + shipments.length - 1
      : 0;

  const selectedColumns = MIS_EXPORT_COLUMNS.filter(
    (column) => exportColumnKeys.includes(column.key)
  );

  const deliveryStatusLabel = {
    all: 'All statuses',
    delivered: 'Delivered',
    'not-delivered': 'Not delivered',
  }[query?.deliveryStatus || 'all'];

  return (
    <section className={s.card} id="mis-report">
      <div className={s.cardHeader}>
        <h2>3. Shipment MIS report</h2>
        <p>
          Filter shipments by client, booking date, consignment
          number, and delivery status, then copy matching
          consignment numbers or download the report.
        </p>
      </div>

      <div className={s.body}>
        <form onSubmit={handlePreview}>
          <div className={s.reportFilters}>
            <label className={s.field}>
              <span>Reporting client</span>

              <select
                value={clientId}
                disabled={loading}
                onChange={(event) =>
                  setClientId(event.target.value)
                }
              >
                <option value="">All clients</option>

                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={s.field}>
              <span>Booking date — from</span>

              <input
                type="date"
                value={from}
                required
                disabled={loading}
                onChange={(event) =>
                  setFrom(event.target.value)
                }
              />
            </label>

            <label className={s.field}>
              <span>Booking date — to</span>

              <input
                type="date"
                value={to}
                required
                disabled={loading}
                onChange={(event) =>
                  setTo(event.target.value)
                }
              />
            </label>

            <label className={s.field}>
              <span>Consignment number (optional)</span>

              <input
                type="search"
                value={consignmentSearch}
                maxLength={80}
                placeholder="Search consignment"
                disabled={loading}
                onChange={(event) =>
                  setConsignmentSearch(event.target.value)
                }
              />
            </label>

            <label className={s.field}>
              <span>Shipment status</span>

              <select
                value={deliveryStatus}
                disabled={loading}
                onChange={(event) =>
                  setDeliveryStatus(event.target.value)
                }
              >
                <option value="all">All statuses</option>
                <option value="delivered">Delivered</option>
                <option value="not-delivered">Not delivered</option>
              </select>
            </label>
          </div>

          <p className={s.help}>
            Not delivered includes any status other than
            Delivered, including shipments without tracking data.
          </p>

          <div className={s.actions}>
            <button
              type="submit"
              className={s.primary}
              disabled={loading}
            >
              {loading ? 'Loading report…' : 'Preview MIS'}
            </button>
          </div>
        </form>

        <fieldset className={s.exportColumns}>
          <legend>MIS columns</legend>
          <p className={s.help}>
            Choose the columns to show in the live report and
            downloaded Excel. Received By is included by default.
          </p>

          <div className={s.exportColumnGrid}>
            {MIS_EXPORT_COLUMNS.map((column) => (
              <label
                key={column.key}
                className={s.exportColumnOption}
              >
                <input
                  type="checkbox"
                  checked={exportColumnKeys.includes(column.key)}
                  disabled={
                    downloading ||
                    (exportColumnKeys.length === 1 &&
                      exportColumnKeys.includes(column.key))
                  }
                  onChange={() =>
                    toggleExportColumn(column.key)
                  }
                />
                <span>{column.header}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {validationError && (
          <div className={s.error} role="alert">
            {validationError}
          </div>
        )}

        {requestError && (
          <div className={s.error} role="alert">
            {requestError}
          </div>
        )}

        {loading && (
          <p className={s.help} role="status">
            Loading shipments…
          </p>
        )}

        {report && (
          <>
            <div className={s.reportSummary}>
              <div>
                <h3>
                  {report.client?.name ||
                    (query.clientId ? 'Client MIS' : 'All clients MIS')}
                </h3>

                <p className={s.help}>
                  Booking dates: {query.from} to {query.to}
                </p>

                <p className={s.help}>
                  {total} matching shipments
                </p>

                <span className={s.badge}>
                  Parent consignments only
                </span>
              </div>

              <button
                type="button"
                className={s.primary}
                disabled={
                  downloading ||
                  copying ||
                  loading ||
                  total === 0
                }
                onClick={downloadExcel}
              >
                {downloading
                  ? 'Preparing Excel…'
                  : 'Download Excel'}
              </button>

              <button
                type="button"
                className={s.secondary}
                disabled={
                  downloading ||
                  copying ||
                  loading ||
                  total === 0
                }
                onClick={copyConsignmentNumbers}
              >
                {copying
                  ? 'Copying numbers…'
                  : 'Copy consignment numbers'}
              </button>
            </div>

            <p className={s.help}>
              Results reflect the filters used for the last
              preview. After changing the inputs, click
              Preview MIS again.
            </p>

            {shipments.length === 0 ? (
              <div className={s.emptyReport}>
                <strong>No shipments found.</strong>

                <p>
                  Check the booking dates
                  {query.clientId ? ' and client mapping' : ''}.
                  {query.clientId
                    ? ' Confirm the PUDO import to create any missing clients and save their customer-name mappings, then preview this report again.'
                    : ' Confirm the PUDO import if shipments are missing, then preview this report again.'}
                </p>
              </div>
            ) : (
              <>
                <div className={s.tableWrapper}>
                  <table
                    className={`${s.table} ${s.reportTable}`}
                  >
                    <caption className={s.reportCaption}>
                      {report.client?.name || 'All clients'} shipment
                      report — booking dates {query.from} to{' '}
                      {query.to}
                      {query.search
                        ? ` · Consignment contains ${query.search}`
                        : ''}
                      {` · ${deliveryStatusLabel}`}
                    </caption>

                    <thead>
                      <tr>
                        {selectedColumns.map((column) => {
                          const isSorted =
                            query.sortBy === column.key;

                          return (
                            <th
                              key={column.key}
                              scope="col"
                              aria-sort={
                                isSorted
                                  ? query.sortDirection === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                  : 'none'
                              }
                            >
                              {column.sortable === false ? (
                                column.header
                              ) : (
                                <button
                                  type="button"
                                  className={s.sortButton}
                                  disabled={loading}
                                  onClick={() =>
                                    changeSort(column)
                                  }
                                >
                                  {column.header}
                                  <span aria-hidden="true">
                                    {isSorted
                                      ? query.sortDirection === 'asc'
                                        ? ' ▲'
                                        : ' ▼'
                                      : ' ↕'}
                                  </span>
                                </button>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {shipments.map((shipment) => (
                        <tr key={shipment.id}>
                          {selectedColumns.map((column) => {
                            const value = getShipmentValue(
                              shipment,
                              column
                            );

                            return (
                              <td
                                key={column.key}
                                className={
                                  column.key === 'recipientAddress'
                                    ? s.addressCell
                                    : undefined
                                }
                              >
                                {column.key === 'consignmentNo' ? (
                                  <strong>{value || '—'}</strong>
                                ) : column.date ? (
                                  formatReportDate(value)
                                ) : (
                                  value == null || value === ''
                                    ? '—'
                                    : value
                                )}

                                {column.key === 'status' &&
                                  shipment.needsReview && (
                                    <span
                                      className={s.reviewFlag}
                                      title={
                                        shipment.reviewReason ||
                                        'This shipment needs review.'
                                      }
                                    >
                                      Needs review
                                    </span>
                                  )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={s.reportPagination}>
                  <p className={s.help} aria-live="polite">
                    Showing {firstRow}–{lastRow} of {total}
                    {' · '}
                    Page {pagination.page} of{' '}
                    {pagination.totalPages}
                  </p>

                  <div className={s.actions}>
                    <button
                      type="button"
                      className={s.secondary}
                      disabled={
                        loading || pagination.page <= 1
                      }
                      onClick={() =>
                        changePage(pagination.page - 1)
                      }
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className={s.secondary}
                      disabled={
                        loading ||
                        pagination.page >=
                          pagination.totalPages
                      }
                      onClick={() =>
                        changePage(pagination.page + 1)
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <p className={s.help}>
          The report uses PUDO booking dates, not tracking-event
          dates. Delivered dates are displayed in India time.
          Review warnings do not change the saved shipment status.
        </p>

        {downloadError && (
          <div className={s.error} role="alert">
            {downloadError}
          </div>
        )}

        {downloadNotice && (
          <div className={s.success} role="status">
            {downloadNotice}
          </div>
        )}

        {copyError && (
          <div className={s.error} role="alert">
            {copyError}
          </div>
        )}

        {copyNotice && (
          <div className={s.success} role="status">
            {copyNotice}
          </div>
        )}
      </div>
    </section>
  );
}