import React, { useState } from 'react';
import {
  CONSIGNORS, CONSIGNEES, ROUTES, CURRENCIES, SHIPMENT_NOTES, DECLARATIONS,
} from '../../public/data/internationalInvoicePresets';

const Picker = ({ label, options, onPick }) => {
  const [value, setValue] = useState(options[0]?.id || '');

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const opt = options.find((o) => o.id === e.target.value);
          if (opt) onPick(opt.data);
        }}
      >
        <option value="">— Custom (type manually) —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </label>
  );
};

const PresetSelectors = ({ onPick }) => (
  <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
    <Picker label="Consignor"      options={CONSIGNORS}     onPick={onPick} />
    <Picker label="Consignee"      options={CONSIGNEES}     onPick={onPick} />
    <Picker label="Route"          options={ROUTES}         onPick={onPick} />
    <Picker label="Currency"       options={CURRENCIES}     onPick={onPick} />
    <Picker label="Shipment note"  options={SHIPMENT_NOTES} onPick={onPick} />
    <Picker label="Declaration"    options={DECLARATIONS}   onPick={onPick} />
  </div>
);

export default PresetSelectors;