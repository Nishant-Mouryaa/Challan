import React, { useEffect, useState } from 'react';
import SenderSelector from './SenderSelector';
import ClientSelector from './ClientSelector';
import { authenticatedFetch } from '../lib/supabaseClient';
import styles from '../styles/invoiceWorkspace.module.css';

const InternationalPartySelectors = ({
  invoiceData,
  updateInvoiceData,
  updateConsignorDetails,
  updateConsigneeDetails,
  showSender,
  showReceiver,
}) => {
  const consignor = invoiceData.consignorDetails || {};
  const consignee = invoiceData.consigneeDetails || {};
  const [previousConsignees, setPreviousConsignees] = useState([]);
  const [loadingPreviousConsignees, setLoadingPreviousConsignees] =
    useState(false);
  const [previousConsigneesError, setPreviousConsigneesError] = useState('');

  useEffect(() => {
    if (!showReceiver) return undefined;

    let cancelled = false;

    const loadPreviousConsignees = async () => {
      setLoadingPreviousConsignees(true);
      setPreviousConsigneesError('');

      try {
        const response = await authenticatedFetch('/api/international-invoices');
        if (!response.ok) {
          throw new Error('Failed to load previous invoice recipients');
        }

        const invoices = await response.json();
        if (!Array.isArray(invoices)) {
          throw new Error('Unexpected response while loading previous recipients');
        }

        const seen = new Set();
        const recipients = [];

        invoices.forEach((invoice) => {
          const consigneeDetails = invoice?.consigneeDetails;
          if (!consigneeDetails || typeof consigneeDetails !== 'object') return;

          const details = {
            name: consigneeDetails.name || '',
            company: consigneeDetails.company || '',
            address: consigneeDetails.address || '',
            city: consigneeDetails.city || '',
            country: consigneeDetails.country || '',
            phone: consigneeDetails.phone || '',
          };
          const normalizedDetails = Object.values(details)
            .map((value) => String(value).trim().replace(/\s+/g, ' ').toLowerCase())
            .join('\u001f');

          if (
            (!details.name && !details.company && !details.address) ||
            seen.has(normalizedDetails)
          ) {
            return;
          }

          seen.add(normalizedDetails);
          recipients.push({
            id: String(invoice.id || normalizedDetails),
            details,
          });
        });

        if (!cancelled) setPreviousConsignees(recipients);
      } catch (error) {
        console.error('Error fetching previous invoice recipients:', error);
        if (!cancelled) {
          setPreviousConsigneesError(
            error.message || 'Unable to load previous invoice recipients'
          );
        }
      } finally {
        if (!cancelled) setLoadingPreviousConsignees(false);
      }
    };

    loadPreviousConsignees();
    return () => {
      cancelled = true;
    };
  }, [showReceiver]);

  const selectSender = (sender) => {
    if (!sender) return;

    updateInvoiceData({ senderId: sender.id });
    updateConsignorDetails({
      company: sender.company || '',
      address: sender.address || '',
      area: sender.area || '',
      city: sender.city || '',
      pin: sender.pin || '',
      phone: sender.contactNo || '',
    });
  };

  const selectClient = (client) => {
    if (!client) {
      updateConsigneeDetails({ clientId: null });
      return;
    }

    updateConsigneeDetails({
      clientId: client.id,
      name: client.name || '',
      company: client.company || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || '',
      phone: client.contactNo || '',
    });
  };

  const selectPreviousConsignee = (event) => {
    const recipientId = event.target.value;
    const recipient = previousConsignees.find(
      (item) => item.id === recipientId
    );
    if (!recipient) return;

    updateConsigneeDetails({
      clientId: null,
      ...recipient.details,
    });
  };

  return (
    <>
      {showSender && (
        <SenderSelector
          senderId={invoiceData.senderId}
          senderDetails={{
            company: consignor.company || '',
            address: consignor.address || '',
            area: consignor.area || '',
            city: consignor.city || '',
            pin: consignor.pin || '',
            contactNo: consignor.phone || '',
          }}
          onSenderSelect={selectSender}
          onSenderDetailsChange={(details) =>
            updateConsignorDetails({
              ...details,
              phone: details.contactNo,
            })
          }
          showDetails={false}
        />
      )}
      {showReceiver && (
        <div className={styles.partySelectorOptions}>
          <ClientSelector
            onSelect={selectClient}
            selectedClientId={consignee.clientId}
          />
          <div className={styles.field}>
            <label htmlFor="previous-invoice-consignee">
              Use a recipient from a previous invoice
            </label>
            <select
              id="previous-invoice-consignee"
              value=""
              onChange={selectPreviousConsignee}
              disabled={
                loadingPreviousConsignees || previousConsignees.length === 0
              }
            >
              <option value="">
                {loadingPreviousConsignees
                  ? 'Loading previous recipients...'
                  : previousConsigneesError
                    ? 'Previous recipients unavailable'
                    : previousConsignees.length > 0
                      ? 'Select a previous recipient'
                      : 'No previous invoice recipients'}
              </option>
              {previousConsignees.map(({ id, details }) => {
                const label = [
                  details.name || details.company || 'Unnamed recipient',
                  details.company && details.company !== details.name
                    ? details.company
                    : '',
                  details.address,
                  [details.city, details.country].filter(Boolean).join(', '),
                ]
                  .filter(Boolean)
                  .join(' — ');

                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
            </select>
            {previousConsigneesError && (
              <div
                className={`${styles.alert} ${styles.errorAlert}`}
                role="alert"
              >
                Previous invoice recipients could not be loaded:{' '}
                {previousConsigneesError}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InternationalPartySelectors;
