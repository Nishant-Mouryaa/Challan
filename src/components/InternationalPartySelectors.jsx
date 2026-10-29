import React from 'react';
import SenderSelector from './SenderSelector';
import ClientSelector from './ClientSelector';

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
      address: client.address || '',
      city: client.city || '',
      phone: client.contactNo || '',
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
        <ClientSelector
          onSelect={selectClient}
          selectedClientId={consignee.clientId}
        />
      )}
    </>
  );
};

export default InternationalPartySelectors;
