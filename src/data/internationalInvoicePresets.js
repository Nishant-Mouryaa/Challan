export const CONSIGNORS = [
  {
    id: 'bruker-india',
    label: 'Bruker India Scientific Pvt Ltd',
    data: {
      consignorDetails: {
        company: 'BRUKER INDIA SCIENTIFIC PVT LTD',
        address: '609,6TH FLOOR ,WEST WING,',
        building: 'SATELITE GAZEBO BUILDING',
        area: 'ANDHERI EAST',
          city: 'MUMBAI',
            pin: '400093',

        phone: '022 61128840',
        gstin: '27AAACB2346K1ZR',
      },
    },
  },
];

export const CONSIGNEES = [
  {
    id: 'bruker-axs',
    label: 'Klaus Galbach – Bruker AXS SE (Karlsruhe)',
    data: {
      consigneeDetails: {
        name: 'KLAUS GALBACH',
        company: 'BRUKER AXS SE',
        address: 'WARENANNAHME GEBAUDE 30\nOSTLICHE RHEINBRUCKENSTRABE 49',
        city: '76187 KARLSRUHE',
        country: 'GERMANY',
        phone: '+4972150997-5260',
      },
    },
  },
];

export const ROUTES = [
  {
    id: 'mumbai-germany',
    label: 'Mumbai → Germany',
    data: {
      origin: 'MUMBAI',
      destination: 'GERMANY',
      portOfDischarge: 'MUMBAI',
      finalDestination: 'GERMANY',
    },
  },
];

export const CURRENCIES = [
  { id: 'USD', label: 'USD – Dollar', data: { currencyCode: 'USD', currencyName: 'DOLLAR' } },
  { id: 'EUR', label: 'EUR – Euro',   data: { currencyCode: 'EUR', currencyName: 'EURO' } },
];

export const SHIPMENT_NOTES = [
  {
    id: 'no-commercial-value',
    label: 'No commercial value / customs purpose',
    data: {
      shipmentNotes:
        'THIS SHIPMENT HAS NO COMMERCIAL VALUE\nTHE VALUE MENTIONED IS FOR CUSTOMS PURPOSE ONLY',
    },
  },
];

export const DECLARATIONS = [
  {
    id: 'actual-price',
    label: 'Invoice shows actual price',
    data: { declaration: 'We declare that this invoice shows the actual price of the goods' },
  },
];

// Used by the items table "Select product" dropdown
export const PRODUCTS = [
  {
    id: 'lynxeye-xe-t',
    label: 'LYNXEYE XE-T Detektor Modul 500 Um',
    data: {
      hsnCode: '9801001012',
      description: 'LYNXEYE XE -T Detektor Modul 500 Um',
      ratePerPiece: 200,
      volWeight: '53 x 44 x 19',
    },
  },
];

export const DEFAULT_SIGNATORY = {
  name: 'WILBIN D MELLO',
  designation: 'EXECUTIVE',
  mobile: '9823659773',
};

export const EXPORTER_DEFAULTS = {
  contactPerson: 'WILBUN DMELLO',
  email: 'Wilbun.Dmello@bruker.com',
  mobile: '9823659773',
  iecCode: '0305019503',
  iecBranchCode: 'BOFA0MM6205',
  pan: '27AAACB2346',
  adCode: '64300026000009',
  stateOfOrigin: 'MAHARASHTRA',
  districtOfOrigin: 'MUMBAI',
  portOfLoading: 'Mumbai ( BOM )',
};

export const EMPTY_ITEM = {
  hsnCode: '',
  description: '',
  quantity: 1,
  ratePerPiece: 0,
  amount: 0,
  actualWeight: '',
  volWeight: '',
  returnOrder: '',
};
// Pre-filled starting state for a new invoice (first option of each list)
export const buildInitialInvoice = () => {
  const first = { ...EMPTY_ITEM, ...PRODUCTS[0].data, quantity: 1 };
  first.amount = first.quantity * first.ratePerPiece;
  return {
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    buyersOrderNo: '',
    otherRef: '',
    buyerIfOther: '',
    ...CONSIGNORS[0].data,
    ...CONSIGNEES[0].data,
    ...ROUTES[0].data,
    ...CURRENCIES[0].data,
    ...SHIPMENT_NOTES[0].data,
    ...DECLARATIONS[0].data,
    items: [first],
    totalAmount: first.amount,
        awbNo: '',
    mawbNo: '',
    netWeight: '',
    grossWeight: '',
        dimensionalWeight: '',
    totalPackages: '',
  };
};