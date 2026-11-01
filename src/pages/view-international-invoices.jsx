import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Head from 'next/head';
import Link from 'next/link';
import { createPortal } from 'react-dom';

import MainLayout from '../components/Layout/MainLayout';

import { formatDate } from '../utils/formatters';
import { authenticatedFetch } from '../lib/supabaseClient';

import s from '../styles/invoiceList.module.css';

/* =========================================================
   HELPERS
   ========================================================= */

const PAGE_SIZE = 10;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value) =>
  toNumber(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const displayDate = (value) => {
  if (!value) return '—';

  try {
    return formatDate(value) || '—';
  } catch {
    return '—';
  }
};

const dateTimestamp = (value) => {
  const timestamp = new Date(value || '').getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getItemAmount = (item) => {
  if (
    item.amount !== undefined &&
    item.amount !== null &&
    item.amount !== ''
  ) {
    return toNumber(item.amount);
  }

  return (
    toNumber(item.quantity) * toNumber(item.ratePerPiece)
  );
};

const getInvoiceTotal = (invoice) => {
  if (
    invoice.totalAmount !== undefined &&
    invoice.totalAmount !== null &&
    invoice.totalAmount !== ''
  ) {
    return toNumber(invoice.totalAmount);
  }

  return (invoice.items || []).reduce(
    (total, item) => total + getItemAmount(item),
    0
  );
};

const readResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/* =========================================================
   SMALL SVG ICONS
   ========================================================= */

const paths = {
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14-5L3 9" />
      <path d="M3 3v6h6M4 13a8 8 0 0 0 14 5l3-3" />
      <path d="M15 15h6v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="m16 3 5 5-12 12-6 1 1-6Z" />
      <path d="m14 5 5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </>
  ),
};

const Icon = ({ name, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {paths[name] || paths.file}
  </svg>
);

/* =========================================================
   SUMMARY CARD
   ========================================================= */

const StatCard = ({ icon, label, value, hint }) => (
  <div className={s.statCard}>
    <div className={s.statIcon}>
      <Icon name={icon} size={20} />
    </div>

    <div>
      <span className={s.statLabel}>{label}</span>
      <strong className={s.statValue}>{value}</strong>
      <span className={s.statHint}>{hint}</span>
    </div>
  </div>
);

/* =========================================================
   PARTY DETAILS
   ========================================================= */

const PartyCard = ({ title, party = {}, sender = false }) => {
  const address = [
    party.address,
    party.building,
    party.area,
    party.city,
    party.pin,
    party.country,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <section className={s.partyCard}>
      <h3>{title}</h3>

      <strong>
        {sender
          ? party.company || party.name || 'Not provided'
          : party.name || party.company || 'Not provided'}
      </strong>

      {!sender && party.name && party.company && (
        <span className={s.partyCompany}>
          {party.company}
        </span>
      )}

      <p className={s.address}>
        {address || 'Address not provided'}
      </p>

      <dl className={s.partyMeta}>
        {party.phone && (
          <div>
            <dt>Phone</dt>
            <dd>{party.phone}</dd>
          </div>
        )}

        {party.email && (
          <div>
            <dt>Email</dt>
            <dd>{party.email}</dd>
          </div>
        )}

        {sender &&
          party.idType !== 'aadhaar' &&
          party.gstin && (
            <div>
              <dt>GSTIN</dt>
              <dd>{party.gstin}</dd>
            </div>
          )}

        {sender && party.idType === 'aadhaar' && (
          <div>
            <dt>ID proof</dt>
            <dd>Aadhaar</dd>
          </div>
        )}
      </dl>
    </section>
  );
};

/* =========================================================
   DETAILS MODAL
   ========================================================= */

const InvoiceDetailsModal = ({ invoice, onClose }) => {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not(:disabled), a[href], [tabindex="0"]'
      ) || []
    ).filter((element) => element.getClientRects().length);

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const createdDate = invoice.createdAt
    ? new Date(invoice.createdAt)
    : null;

  const createdLabel =
    createdDate && Number.isFinite(createdDate.getTime())
      ? createdDate.toLocaleString()
      : null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={s.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className={s.modalHeader}>
          <div>
            <div className={s.eyebrow}>INVOICE OVERVIEW</div>

            <h2 id="invoice-detail-title">
              {invoice.invoiceNo || 'Invoice details'}
            </h2>

            <p>
              Review shipment parties, line items, and invoice value.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            className={s.iconButton}
            onClick={onClose}
            aria-label="Close invoice details"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className={s.modalBody}>
          <dl className={s.detailStats}>
            <div>
              <dt>Invoice date</dt>
              <dd>{displayDate(invoice.invoiceDate)}</dd>
            </div>

            <div>
              <dt>Destination</dt>
              <dd>
                {invoice.consigneeDetails?.country || '—'}
              </dd>
            </div>

            <div>
              <dt>Line items</dt>
              <dd>{invoice.items?.length || 0}</dd>
            </div>

            <div className={s.detailTotal}>
              <dt>Invoice value</dt>
              <dd>
                {invoice.currencyCode || ''}{' '}
                {formatAmount(getInvoiceTotal(invoice))}
              </dd>
            </div>
          </dl>

          <div className={s.partyGrid}>
            <PartyCard
              title="Sender / consignor"
              party={invoice.consignorDetails}
              sender
            />

            <PartyCard
              title="Recipient / consignee"
              party={invoice.consigneeDetails}
            />
          </div>

          {(invoice.origin ||
            invoice.destination ||
            invoice.awbNo ||
            invoice.totalPackages) && (
            <section className={s.shippingCard}>
              <h3>Shipment information</h3>

              <dl className={s.shippingGrid}>
                {[
                  ['Origin', invoice.origin],
                  ['Destination', invoice.destination],
                  ['AWB number', invoice.awbNo],
                  ['Packages', invoice.totalPackages],
                  ['Net weight', invoice.netWeight],
                  ['Gross weight', invoice.grossWeight],
                ]
                  .filter(
                    ([, value]) =>
                      value !== undefined &&
                      value !== null &&
                      value !== ''
                  )
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          <section>
            <div className={s.detailSectionHeader}>
              <h3>Invoice items</h3>

              <span className={s.countBadge}>
                {invoice.items?.length || 0} items
              </span>
            </div>

            <div className={s.tableScroller}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Description</th>
                    <th scope="col">HSN code</th>
                    <th scope="col" className={s.numeric}>
                      Qty
                    </th>
                    <th scope="col" className={s.numeric}>
                      Rate
                    </th>
                    <th scope="col" className={s.numeric}>
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(invoice.items || []).map((item, index) => (
                    <tr key={item.id ?? index}>
                      <td>{index + 1}</td>

                      <td className={s.description}>
                        {item.description || '—'}
                      </td>

                      <td>{item.hsnCode || '—'}</td>

                      <td className={s.numeric}>
                        {item.quantity ?? '—'}
                      </td>

                      <td className={s.numeric}>
                        {formatAmount(item.ratePerPiece)}
                      </td>

                      <td className={s.numeric}>
                        <strong>
                          {formatAmount(getItemAmount(item))}
                        </strong>
                      </td>
                    </tr>
                  ))}

                  {!invoice.items?.length && (
                    <tr>
                      <td colSpan={6} className={s.emptyCell}>
                        No line items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {createdLabel && (
            <p className={s.createdAt}>
              Created {createdLabel}
            </p>
          )}
        </div>

        <footer className={s.modalFooter}>
          <button
            type="button"
            className={`${s.button} ${s.secondaryButton}`}
            onClick={onClose}
          >
            Close
          </button>

          <Link
            href={{
              pathname: '/edit-international-invoice',
              query: { id: invoice.id },
            }}
            className={`${s.button} ${s.primaryButton}`}
          >
            <Icon name="edit" size={16} />
            Edit invoice
          </Link>
        </footer>
      </section>
    </div>,
    document.body
  );
};

/* =========================================================
   PAGE
   ========================================================= */

export default function ViewInternationalInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [country, setCountry] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const requestIdRef = useRef(0);
  const deleteBusyRef = useRef(false);

  const fetchInvoices = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setLoadError('');

    try {
      const response = await authenticatedFetch(
        '/api/international-invoices'
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.error || 'Failed to load invoices.'
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          'The server returned an unexpected invoice format.'
        );
      }

      if (requestId === requestIdRef.current) {
        setInvoices(data);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        console.error('Error fetching invoices:', error);

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Could not load invoices.'
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchInvoices();

    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchInvoices]);

  const countries = [
    ...new Set(
      invoices
        .map((invoice) =>
          String(invoice.consigneeDetails?.country || '').trim()
        )
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const currencies = new Set(
    invoices
      .map((invoice) => invoice.currencyCode)
      .filter(Boolean)
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredInvoices = invoices
    .filter((invoice) => {
      const searchable = [
        invoice.invoiceNo,
        invoice.consigneeDetails?.name,
        invoice.consigneeDetails?.company,
        invoice.consigneeDetails?.country,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchable.includes(normalizedSearch);

      const matchesCountry =
        !country ||
        String(
          invoice.consigneeDetails?.country || ''
        ).trim() === country;

      return matchesSearch && matchesCountry;
    })
    .sort((a, b) => {
      if (sort === 'oldest') {
        return (
          dateTimestamp(a.invoiceDate) -
          dateTimestamp(b.invoiceDate)
        );
      }

      if (sort === 'number') {
        return String(a.invoiceNo || '').localeCompare(
          String(b.invoiceNo || ''),
          undefined,
          { numeric: true }
        );
      }

      if (sort === 'recipient') {
        return String(
          a.consigneeDetails?.name || ''
        ).localeCompare(
          String(b.consigneeDetails?.name || '')
        );
      }

      return (
        dateTimestamp(b.invoiceDate) -
        dateTimestamp(a.invoiceDate)
      );
    });

  const pageCount = Math.max(
    1,
    Math.ceil(filteredInvoices.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const visibleInvoices = filteredInvoices.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const hasFilters = Boolean(searchTerm || country);

  const clearFilters = () => {
    setSearchTerm('');
    setCountry('');
    setPage(1);
  };

  const handleDelete = async (invoice) => {
    if (deleteBusyRef.current) return;

    if (
      !window.confirm(
        `Delete invoice "${invoice.invoiceNo || 'Untitled'}"? ` +
          'This action cannot be undone.'
      )
    ) {
      return;
    }

    deleteBusyRef.current = true;
    setDeletingId(invoice.id);
    setLoadError('');
    setNotice('');

    try {
      const response = await authenticatedFetch(
        `/api/international-invoices/${encodeURIComponent(
          invoice.id
        )}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await readResponse(response);

        throw new Error(
          data?.error || 'Failed to delete invoice.'
        );
      }

      setInvoices((previous) =>
        previous.filter((item) => item.id !== invoice.id)
      );

      setNotice('Invoice deleted successfully.');
    } catch (error) {
      console.error('Error deleting invoice:', error);

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Could not delete invoice.'
      );
    } finally {
      deleteBusyRef.current = false;
      setDeletingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>International invoices — DC System</title>
      </Head>

      <MainLayout>
        <div className={s.page}>
          {/* ================= HEADER ================= */}

          <header className={s.pageHeader}>
            <div>
              <div className={s.eyebrow}>
                INTERNATIONAL SHIPPING
              </div>

              <h1>International invoices</h1>

              <p>
                Find, review, and manage your export invoices.
              </p>
            </div>

            <div className={s.headerActions}>
              <button
                type="button"
                className={`${s.button} ${s.secondaryButton}`}
                onClick={fetchInvoices}
                disabled={loading || deletingId !== null}
              >
                <Icon name="refresh" size={16} />
                Refresh
              </button>

              <Link
                href="/international-invoice"
                className={`${s.button} ${s.primaryButton}`}
              >
                <Icon name="plus" size={17} />
                New invoice
              </Link>
            </div>
          </header>

          {/* ================= STATUS ================= */}

          {loadError && (
            <div className={s.errorAlert} role="alert">
              <span>{loadError}</span>

              <button
                type="button"
                className={s.textButton}
                onClick={fetchInvoices}
                disabled={loading}
              >
                Retry loading
              </button>
            </div>
          )}

          {notice && (
            <div className={s.successAlert} role="status">
              <span>{notice}</span>

              <button
                type="button"
                className={s.dismissButton}
                onClick={() => setNotice('')}
                aria-label="Dismiss notification"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}

          {/* ================= SUMMARY ================= */}

          <div className={s.statsGrid}>
            <StatCard
              icon="file"
              label="Total invoices"
              value={loading && !invoices.length ? '—' : invoices.length}
              hint="Invoices in your workspace"
            />

            <StatCard
              icon="globe"
              label="Destinations"
              value={loading && !invoices.length ? '—' : countries.length}
              hint="Unique destination countries"
            />

            <StatCard
              icon="file"
              label="Currencies"
              value={loading && !invoices.length ? '—' : currencies.size}
              hint="Currencies used in your invoices"
            />
          </div>

          {/* ================= INVOICE LIST ================= */}

          <section
            className={s.listCard}
            aria-labelledby="invoice-list-heading"
            aria-busy={loading}
          >
            <div className={s.listHeader}>
              <div>
                <h2 id="invoice-list-heading">
                  Invoice library
                </h2>

                <p>
                  Search by invoice number, recipient, company,
                  or country.
                </p>
              </div>

              <span className={s.countBadge}>
                {filteredInvoices.length} results
              </span>
            </div>

            <div className={s.filters}>
              <label className={s.search}>
                <Icon name="search" size={18} />

                <span className={s.srOnly}>
                  Search invoices
                </span>

                <input
                  type="search"
                  placeholder="Search invoices…"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <label className={s.filterField}>
                <span>Destination</span>

                <select
                  value={country}
                  onChange={(event) => {
                    setCountry(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All countries</option>

                  {countries.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={s.filterField}>
                <span>Sort by</span>

                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">
                    Invoice date: newest
                  </option>

                  <option value="oldest">
                    Invoice date: oldest
                  </option>

                  <option value="number">
                    Invoice number
                  </option>

                  <option value="recipient">
                    Recipient name
                  </option>
                </select>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  className={s.textButton}
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div className={s.statePanel} role="status">
                <span className={s.spinner} />
                <strong>Loading invoices</strong>
                <p>Retrieving your invoice library…</p>
              </div>
            ) : !filteredInvoices.length ? (
              <div className={s.statePanel}>
                <div className={s.emptyIcon}>
                  <Icon
                    name={hasFilters ? 'search' : 'file'}
                    size={26}
                  />
                </div>

                <strong>
                  {hasFilters
                    ? 'No matching invoices'
                    : loadError
                      ? 'Invoices could not be loaded'
                      : 'Your invoice library is empty'}
                </strong>

                <p>
                  {hasFilters
                    ? 'Try another search or remove your filters.'
                    : loadError
                      ? 'Retry loading to view your invoices.'
                      : 'Create your first export invoice to get started.'}
                </p>

                {hasFilters ? (
                  <button
                    type="button"
                    className={`${s.button} ${s.secondaryButton}`}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : loadError ? (
                  <button
                    type="button"
                    className={`${s.button} ${s.secondaryButton}`}
                    onClick={fetchInvoices}
                  >
                    Try again
                  </button>
                ) : (
                  <Link
                    href="/international-invoice"
                    className={`${s.button} ${s.primaryButton}`}
                  >
                    <Icon name="plus" size={16} />
                    Create invoice
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className={s.tableScroller}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th scope="col">Invoice</th>
                        <th scope="col">Recipient</th>
                        <th scope="col">Destination</th>
                        <th
                          scope="col"
                          className={s.numeric}
                        >
                          Invoice value
                        </th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <button
                              type="button"
                              className={s.invoiceLink}
                              onClick={() =>
                                setSelectedInvoice(invoice)
                              }
                            >
                              {invoice.invoiceNo || 'Untitled'}
                            </button>

                            <span className={s.cellSubtext}>
                              {displayDate(invoice.invoiceDate)}
                            </span>
                          </td>

                          <td>
                            <strong className={s.recipientName}>
                              {invoice.consigneeDetails?.name ||
                                'Not provided'}
                            </strong>

                            {invoice.consigneeDetails?.company && (
                              <span className={s.cellSubtext}>
                                {invoice.consigneeDetails.company}
                              </span>
                            )}
                          </td>

                          <td>
                            <span className={s.countryBadge}>
                              {invoice.consigneeDetails?.country ||
                                '—'}
                            </span>
                          </td>

                          <td className={s.numeric}>
                            <strong>
                              {formatAmount(
                                getInvoiceTotal(invoice)
                              )}
                            </strong>

                            <span className={s.cellSubtext}>
                              {invoice.currencyCode || '—'}
                            </span>
                          </td>

                          <td>
                            <div className={s.rowActions}>
                              <button
                                type="button"
                                className={s.actionButton}
                                onClick={() =>
                                  setSelectedInvoice(invoice)
                                }
                                aria-label={`View invoice ${invoice.invoiceNo || ''}`}
                                title="View details"
                              >
                                <Icon name="eye" size={17} />
                              </button>

                              <Link
                                href={{
                                  pathname:
                                    '/edit-international-invoice',
                                  query: { id: invoice.id },
                                }}
                                className={s.actionButton}
                                aria-label={`Edit invoice ${invoice.invoiceNo || ''}`}
                                title="Edit invoice"
                              >
                                <Icon name="edit" size={16} />
                              </Link>

                              <button
                                type="button"
                                className={`${s.actionButton} ${s.deleteButton}`}
                                onClick={() =>
                                  handleDelete(invoice)
                                }
                                disabled={deletingId !== null}
                                aria-label={`Delete invoice ${invoice.invoiceNo || ''}`}
                                title="Delete invoice"
                              >
                                {deletingId === invoice.id ? (
                                  <span
                                    className={s.smallSpinner}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Icon
                                    name="trash"
                                    size={16}
                                  />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <footer className={s.pagination}>
                  <span>
                    Showing{' '}
                    <strong>{startIndex + 1}</strong>–
                    <strong>
                      {Math.min(
                        startIndex + PAGE_SIZE,
                        filteredInvoices.length
                      )}
                    </strong>{' '}
                    of {filteredInvoices.length} invoices
                  </span>

                  <div className={s.paginationActions}>
                    <button
                      type="button"
                      className={`${s.button} ${s.secondaryButton}`}
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setPage(currentPage - 1)
                      }
                    >
                      Previous
                    </button>

                    <span aria-live="polite">
                      {currentPage} / {pageCount}
                    </span>

                    <button
                      type="button"
                      className={`${s.button} ${s.secondaryButton}`}
                      disabled={currentPage >= pageCount}
                      onClick={() =>
                        setPage(currentPage + 1)
                      }
                    >
                      Next
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>

        {selectedInvoice && (
          <InvoiceDetailsModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </MainLayout>
    </>
  );
}