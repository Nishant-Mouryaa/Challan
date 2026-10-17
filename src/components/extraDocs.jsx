import React from 'react';
import x from '../styles/extraDocs.module.css';
import {
  SB_TYPES, SLI_DOCS,
  buildPackingListDefaults, buildSliDefaults, buildAnnexureDefaults, buildNonScometDefaults,
} from '../utils/exportDocuments';

const lines = (s) => (s || '').split('\n');
const Tick = ({ on }) => <span className={x.tick}>{on ? '✓' : ''}</span>;

/* =============== PACKING LIST =============== */
const LR = ({ label, children, top, plain }) => (
  <div className={`${x.lr} ${top ? x.lrTop : ''}`}>
    <div>{label}</div>
    <div className={`${x.lv} ${x.pre} ${plain ? x.plain : ''}`}>{children}</div>
  </div>
);

const PackingListSheet = ({ d }) => {
  const desc = lines(d.goodsDesc);
  const qty = lines(d.goodsQty);
  const rem = lines(d.goodsRemarks);
  const n = Math.max(desc.length, qty.length, rem.length);

  return (
    <div className={x.pBox}>
      <div className={x.pTop}>
        <div className={x.pLeft}>
          <LR label="Exporter">{d.exporterBlock}</LR>
          <LR label="Zip Code">{d.exporterZip}</LR>
          <LR label="Country">{d.exporterCountry}</LR>
          <LR label="ctc person">{d.exporterContact}</LR>
          <LR label="Tel.No.s">{d.exporterTel}</LR>
          <LR label="E-mail ID" plain>{d.exporterEmail}</LR>
          <LR label="Consignee" top>{d.consigneeBlock}</LR>
          <LR label="Zip Code">{d.consigneeZip}</LR>
          <LR label="Country">{d.consigneeCountry}</LR>
          <LR label="ctc person">{d.consigneeContact}</LR>
          <LR label="Tel No">{d.consigneeTel}</LR>
          <LR label="E-mail ID">{d.consigneeEmail}</LR>
        </div>

        <div className={x.pRight}>
          <div className={`${x.rr} ${x.r1}`}>
            <div className={x.invL}>
              <div>Invoice No. &amp; Date</div>
              <div className={x.center}>{d.invoiceNo}</div>
            </div>
            <div className={x.invR}>{d.invoiceDate}</div>
          </div>
          <div className={`${x.rr} ${x.r2}`}>Buyer's Order No. &amp; Date {d.buyersOrder}</div>
          <div className={`${x.rr} ${x.r3}`}>Other reference(s) {d.otherRef}</div>
          <div className={`${x.rr} ${x.r4}`}>
            <div>IEC Code No: {d.iec}</div>
            <div>AD Code : {d.ad}</div>
          </div>
          <div className={`${x.rr} ${x.r5}`}>
            <div>Buyer ( if other than consignee )</div>
            <div className={x.r5v}>{d.buyerOther}</div>
          </div>
          <div className={`${x.rr} ${x.r6}`}>
            <div><div>Country of origin of goods</div><div>{d.originCountry}</div></div>
            <div><div>Country of final destination</div><div>{d.destCountry}</div></div>
          </div>
        </div>
      </div>

      <div className={x.pMid}>
        <div className={x.mLeft}>
          <div className={`${x.mRow} ${x.m1}`}>
            <div>Pre-Carriage by<div className={x.center}>{d.preCarriage}</div></div>
            <div>Place of Receipt by pre-carrier<div className={x.center}>{d.placeOfReceipt}</div></div>
          </div>
          <div className={`${x.mRow} ${x.m2}`}>
            <div>Vessel / Flight No.<div className={x.center}>{d.vessel}</div></div>
            <div>Port of Loading<div className={x.center}>{d.portLoading}</div></div>
          </div>
          <div className={`${x.mRow} ${x.m3}`}>
            <div>Port of Discharge<div className={x.center}>{d.portDischarge}</div></div>
            <div>Final Destination<div className={x.center}>{d.finalDest}</div></div>
          </div>
        </div>
        <div className={x.mRight}>
          <div className={x.mHead}>Terms of Delivery &amp; payment</div>
          <div className={x.mPad}>{d.termsDelivery}</div>
          <div className={`${x.mPad} ${x.payT}`}>Payment Terms: {d.paymentTerms}</div>
        </div>
      </div>

      <div className={x.gHead}>
        <div className={x.pre}>{'Marks & No.\nOf Packages'}</div>
        <div className={x.gh2}>Description of the Goods Description of Goods</div>
        <div className={x.center}>Quantity</div>
        <div className={x.center}>Remarks</div>
      </div>

      <div className={x.gBody}>
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className={x.gRow}>
            <div className={x.gc}>{i === 0 ? d.marks : ''}</div>
            <div className={x.gc} />
            <div className={x.gc}>{desc[i]}</div>
            <div className={x.gc}>{qty[i]}</div>
            <div className={x.gc}>{rem[i]}</div>
          </div>
        ))}
        <div className={`${x.gRow} ${x.gFill}`}>
          <div className={x.gc} /><div className={x.gc} /><div className={x.gc} />
          <div className={x.gc} /><div className={x.gc} />
          <div className={x.wBox}>
            <div className={x.wRow}><u>NET WT.</u><u>GRS.WT.</u><span>DIMENSIONAL WEIGHT</span></div>
            <div className={x.wRow}><span>{d.netWt} KGS</span><span>{d.grsWt} KGS</span><span>{d.dimWt}</span></div>
            <div className={x.wRow}><span>KGS.</span><span>KGS.</span><span /></div>
          </div>
        </div>
      </div>

      <div className={x.pFoot}>
        <div className={x.fLeft}>
          <div>Declaration:</div>
          <div>{d.declaration}</div>
        </div>
        <div className={x.fRight}>
          <div className={x.fTotal}>{d.totalRemark}</div>
          <div className={x.sign}>
            <div>For</div>
            <div>{d.exporterName}</div>
            <div className={x.signBot}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============== DHL SLI =============== */
const KV = ({ label, children, h = 3.6, bot, left }) => (
  <div className={`${x.kv} ${bot ? x.bot : ''} ${left ? x.left : ''}`} style={{ minHeight: `${h}mm` }}>
    <div className={x.pre}>{label}</div>
    <div className={x.pre}>{children}</div>
  </div>
);
const K3 = ({ label, children }) => (
  <div className={x.k3}>
    <div>{label}</div>
    <div className={x.center}>:</div>
    <div className={`${x.k3v} ${x.pre}`}>{children}</div>
  </div>
);

const SliSheet = ({ d }) => (
  <div className={x.sBox}>
    <div className={`${x.yel} ${x.yTop}`} />
    <div className={x.hdr}>
      <div>Shipper Name:</div><div className={x.center}>{d.shipper}</div>
      <div>Invoice No.:</div><div className={x.center}>{d.invoiceNo}</div>
      <div>Consignee Name:</div><div className={x.center}>{d.consignee}</div>
      <div>Invoice Date:</div><div className={x.center}>{d.invoiceDate}</div>
    </div>
    <div className={`${x.yel} ${x.yMid}`} />

    <KV label="DHL AIR WAYBILL NUMBER (AWB) :">{d.awb}</KV>
    <KV label="IE CODE NO (10 DIGIT) :">{d.iec}</KV>
    <KV label="IEC BRANCH CODE :">{d.branch}</KV>
    <KV label="PAN NUMBER :">{d.pan}</KV>
    <div className={x.kv}>
      <div>GSTIN NUMBER :</div>
      <div className={x.gstin}><div>{d.gstin}</div><div /><div /></div>
    </div>
    <KV h={7} label="IGST Payment Status (Mandatory to TICK MARK from below option (A, B or C) in front of column provided :" />
    <KV h={7.2} bot label="A ) NOT APPLICABLE (Valid Reason to be provided)">{d.igstA}</KV>
    <KV h={7.6} bot label="B ) LUT- Export Under Bond (Copy of valid LUT Required)">{d.igstB}</KV>
    <KV h={12.7} bot left label="C ) Export Against Payment (in INR on export invoice)">{d.igstC}</KV>
    <KV label="End use code (EU Code)" />
    <div className={x.kv} style={{ minHeight: '15.7mm' }}>
      <div className={x.botLabel}>RoDTEP Benefit to be claimed (Please tick Y / N)</div>
      <div className={x.rod}>
        <div>Y<br />(Invoice should mention intent to claim RoDTEP benefit and UQC at line item level)</div>
        <div><Tick /></div>
        <div>N</div>
        <div><Tick /></div>
        <div>Total No. of line items in invoice?</div>
        <div />
        <div>RoDTEP will be claimed for which line item numbers?</div>
        <div />
      </div>
    </div>
    <KV label="BANK AD CODE # (PART I & II) :">{d.adCode}</KV>
    <KV label="INCOTERMS : F O B / C & F / C & I / C I F :">{d.incoterms}</KV>
    <KV label="NATURE OF PAYMENT : D P / D A / A P">{d.nature}</KV>

    <K3 label="FOB VALUE">{d.fob}</K3>
    <K3 label="FREIGHT (IF ANY)">{d.freight}</K3>
    <K3 label="INSURANCE (IF ANY)">{d.insurance}</K3>
    <K3 label="COMMISSION (IF ANY)">{d.commission}</K3>
    <K3 label="DISCOUNT (IF ANY)">{d.discount}</K3>
    <K3 label="PACKING CHARGES (IF ANY)">{d.packing}</K3>
    <K3 label="NO. OF PKGS.">{d.pkgs}</K3>
    <K3 label="NET WT. (KGS.)">{d.net}</K3>
    <K3 label="GROSS WT. (KGS)">{d.gross}</K3>
    <K3 label="STATE OF ORIGIN">{d.state}</K3>
    <K3 label="DISTRICT OF ORIGIN">{d.district}</K3>
    <K3 label="EXPORT UNDER PTA/FTA"><span className={x.reg}>{d.pta}</span></K3>
    <div className={x.k3}>
      <div>CATEGORY OF SHIPPER (Please tick)</div><div className={x.center}>:</div>
      <div className={x.cat}><div>Merchant</div><div><Tick /></div><div>Manufacturer</div><div><Tick /></div><div /></div>
    </div>
    <div className={x.k3} style={{ minHeight: '7mm' }}>
      <div>If Merchant, manufacturer details to be updated in SB (Please Tick)</div><div className={x.center}>:</div>
      <div className={x.cat2}><div>Y</div><div><Tick /></div><div>N</div><div><Tick /></div><div>If Y, Please provide Manufacturer name:</div><div /></div>
    </div>

    <div className={`${x.yel} ${x.yRow}`}>Special instructons, if any</div>
    <div className={`${x.special} ${x.pre}`}>{d.special}</div>

    <div className={`${x.yel} ${x.sbH}`}>
      <div>TYPE OF SHIPPING BILL (TICK MARK)</div>
      <div>BELOW DOCUMENTS REQUIRED WITH THE SHIPMENT</div>
    </div>
    {SB_TYPES.map(([l, label, , docs]) => (
      <div key={l} className={x.sb}>
        <div>{l}) {label}</div>
        <div className={`${x.center} ${d[`sb${l}`] === 'N/A' ? x.b : ''}`}>{d[`sb${l}`]}</div>
        <div className={x.reg}>{docs}</div>
      </div>
    ))}

    <div className={`${x.yel} ${x.yRow}`}>Please TICK &amp; LIST the documents provided to DHL with the shipment :</div>
    <div className={x.dk}>
      <div>{SLI_DOCS.slice(0, 4).map(([k, l]) => (
        <div key={k} className={x.dkItem}><span>{l}</span><Tick on={d[`tick_${k}`]} /></div>))}</div>
      <div>{SLI_DOCS.slice(4, 8).map(([k, l]) => (
        <div key={k} className={x.dkItem}><span>{l}</span><Tick on={d[`tick_${k}`]} /></div>))}</div>
      <div>{SLI_DOCS.slice(8).map(([k, l]) => (
        <div key={k} className={x.dkItem}><span>{l}</span><Tick on={d[`tick_${k}`]} /></div>))}</div>
    </div>
    <div className={x.auth}>
      In forwarding this document, I/We authorize DHL Express (India) Pvt. Ltd. (‘DHL’), its group companies and their agents, to act as our agent to clear this Shipment from Customs and also give our consent to sign, submit and file in physical or digitally, the e-way bill / shipping bill and other forms, as and when required, under various statutes to authorities for undertaking the Shipment on our behalf.
    </div>
    <div className={x.notes}>
      <div className={x.pre}>{`Please indicate API (As per Invoice) if any detail is mentioned in the Invoice.
We hereby confirm that the above details declared are true and correct.
We confirm that our company's IEC & Bank AD Code are registered with EDI System of Air Cargo at the port of clearance
SCOMET Declaration is applicable for chapters 28,29,34,38,70,72-85,87-90
LC (Letter of Credit) Shipments are not handled by DHL`}</div>
      <div className={x.noteSign}>SIGNATURE OF EXPORTER/ STAMP</div>
    </div>
  </div>
);

/* =============== ANNEXURE-A =============== */
const slot = (on, mark = 'X') => (on ? `___${mark}____` : '_________');

const AnnexureSheet = ({ d }) => (
  <div className={x.aWrap}>
    <div className={x.aTitle}>Annexure-A</div>
    <div className={x.aSub}>EXPORT VALUE DECLARATION</div>
    <div className={x.aRule}>( See Rule 7 of Customs Valuation (Determination of Value of Export Goods) Rules, 2007.)</div>

    <div className={x.aInd}>
      <div>Shipping Bill No. &amp; Date: - {d.shippingBill}</div>
      <div>Invoice No. &amp; Date: - {d.invoiceRef}</div>
      <div className={x.aGap}>Nature of Transaction</div>
    </div>

    <div className={x.aSmall}>{`Sale   ${slot(d.nature === 'Sale', 'yes')}    Sale on consignment   ${slot(d.nature === 'Sale on consignment', 'yes')}    Gift   ${slot(d.nature === 'Gift', 'yes')}    Basis`}</div>
    <div className={x.aSmall}>{`Sample   ${slot(d.nature === 'Sample', 'yes')}                                         Other   ${slot(d.nature === 'Other', 'yes')}`}</div>
    <div className={x.aSmall}>{`4. Method of Valuation    Rule 3 ${slot(d.valuationRule === 'Rule 3')}   Rule 4 ${slot(d.valuationRule === 'Rule 4')}   Rule 5 ${slot(d.valuationRule === 'Rule 5')}   Rule 6 ${slot(d.valuationRule === 'Rule 6')}\n( See Export Valuation Rules )`}</div>
    <div className={x.aSmall}>{`5.Whether seller and buyer are related    Yes ${slot(d.related === 'Yes')}    No ${slot(d.related === 'No')}`}</div>
    <div className={x.aSmall}>{`6. If yes, whether relationship has    Yes ${slot(d.influenced === 'Yes')}    No ${slot(d.influenced === 'No')}\nInfluenced the price`}</div>
    <div className={x.aSmall}>7.Terms of Payment: - {d.termsPayment}</div>
    <div className={x.aSmall}>8.Terms of Delivery: - {d.termsDelivery}</div>
    <div className={x.aSmall}>9.Previous export of identical / similar goods, if any Shipping Bill No. and Date :- {d.previousExport}</div>
    <div className={x.aSmall}>10. Any other relevant information (Attach separate sheet, if necessary ) {d.otherInfo}</div>

    <div className={x.aDeclH}>DECLARATION</div>
    <div className={x.aDecl}>I/We hereby declare that the information furnished above is true, complete and correct in every respect.{'\n'}I/We also undertake to bring to the notice of proper officer any particulars which subsequently come to my/our knowledge which will have bearing on a valuation.</div>
    <div className={x.aDecl}>Place: {d.place}</div>
    <div className={x.aDecl}>Date : <b>{d.date}</b></div>

    <div className={x.aCo}>{d.company}</div>
    <div className={x.aCo}>DESIGNATION &nbsp;{d.designation}</div>
  </div>
);

/* =============== NON-SCOMET =============== */
const NonScometSheet = ({ d }) => {
  const to = lines(d.toBlock);
  return (
    <div className={x.nWrap}>
      {to.map((l, i) => (
        <div key={i} className={i === to.length - 1 ? x.u : ''}>{l}</div>
      ))}
      <div className={x.nTitle}>NON SCOMET DECLARATION</div>
      <div className={`${x.u} ${x.nRef}`}>Reference: <b>Our Invoice No</b>:- {d.invoiceRef}</div>
      {d.body.split(/\n\s*\n/).filter(Boolean).map((p, i) => (
        <p key={i} className={x.nPara}>{p}</p>
      ))}
      <div className={x.nThanks}>Thanking you</div>
      <div>For {d.company}</div>
      <div className={x.nYours}>Yours faithfully</div>
    </div>
  );
};

/* =============== SHIPPER SELF DECLARATION (NEW) =============== */
const SelfDeclarationSheet = ({ d }) => (
  <div className={x.sdWrap}>
    <div className={x.sdTitle}>SHIPPER SELF -- DECLARATION FORM</div>
    
    <div className={x.sdTop}>
      <div>Date: {d.date}</div>
      <div>To: DHL EXPRESS LTD</div>
      <div>Name of Sales Partner: DHL</div>
      <div>Address: MUMBAI</div>
    </div>

    <div className={x.sdBody}>
      <p>
        As a Shipper of shipment bearing DHL Awb# <strong>{d.awbNo}</strong>, I hereby declare that the Medicines being shipped to <strong>{d.recipientName}</strong> to <strong>{d.recipientCountry}</strong> are permissible for carriage to the destination country as per the prevailing statutory regulations and are also not mentioned in the Narcotic Drugs and Psychotropic Substances Act list by generic name or any trade name and it can be legally exported out of India.
      </p>
      <p>
        I / We declare that we have given accurate and up-to-date contact information in the waybill and shipment documents, including name, address, telephone/mobile number and email address. KYC documents are true and verifiable with original KYC documents. I / We are fully aware that if Shipment related information are found to be incorrect or misleading, I/We will take complete responsibility and will cooperate in any incident of reported violation and legal proceedings as per law.
      </p>
      <p>
        I/We further agree and give consent for the disclosure of all information and documents related to my KYC, when required for verification.
      </p>
    </div>

    <div className={x.sdBottom}>
      <div className={x.sdBox}>
        <div className={x.sdBoxTitle}>Company / Shipper Name & Address :-</div>
        <div>{d.shipperName}</div>
        <div className={x.pre}>{d.shipperAddress}</div>
        <div>MOB: {d.shipperMobile}</div>
        {d.aadharNo && <div>ADHAR CARD NO: {d.aadharNo}</div>}
        <div className={x.sdSign}> (Company stamp / Shipper sign)</div>
      </div>
      <div className={x.sdBox}>
        <div className={x.sdBoxTitle}>Recipient Name and address :-</div>
        <div>{d.recipientName}</div>
        <div className={x.pre}>{d.recipientAddress}</div>
        <div>{d.recipientCity}</div>
        <div>{d.recipientCountry}</div>
        <div>MOB: {d.recipientMobile}</div>
      </div>
    </div>
  </div>
);

/* =============== INDEMNITY LETTER (NEW) =============== */
const IndemnitySheet = ({ d }) => (
  <div className={x.indWrap}>
    <div className={x.indDate}>DATE: {d.date}</div>
    
    <div className={x.indTitle}>
      {d.companyName} <br /><br />
      INDEMINITY LETTER / DECLARATION FOR FRAGILE SHIPMENTS
    </div>

    <div className={x.indTo}>
      <div>TO</div>
      <div>DHL EXPRESS LTD</div>
      <div>MUMBAI</div>
    </div>

    <div className={x.indBody}>
      <p>
        WE HEREBY UNDERTAKE TO SEND OUR CONISGNMENT THROUGH DHL EXPRESS LTD BEING FULLY AWARE THAT IT IS FRAGILE ({d.contents}) & DESPITE THE BEST EFFORTS OF DHL, IT MAY BE DAMAGED IN TRANSIT.
      </p>
      <p>
        THIS HAS BEEN CLEARLY EXPLAINED TO US BY DHL EXPRESS AND WE ARE ACCEPTING THIS FACTS &CONSEQUENTLY UNDERTAKE TO INDEMINITY DHL EXPRESS LTD, IN FULL AGAINST ANY CLAIMS FOR DAMAGE TO THIS FRAGILE SHIPMENT BEING SHIPPED BY US.
      </p>
      <div className={x.indRef}>
        <div>AWB NO: {d.awbNo}</div>
        <div>CONTENT: {d.contents}</div>
      </div>
    </div>

    <div className={x.indSign}>
      <div>THANKING YOU</div>
      <div style={{ marginTop: '20px' }}>For {d.companyName}</div>
      <div className={x.indSignSpace}></div>
      <div style={{ fontWeight: 'bold' }}>{d.companyName}</div>
    </div>
  </div>
);


/* =============== FIELD LISTS (edit panel) =============== */
const F = (k, label, o = {}) => ({ k, label, ...o });

const packingFields = [
  F('invoiceNo', 'Invoice no'), F('invoiceDate', 'Invoice date'),
  F('buyersOrder', "Buyer's order no. & date"), F('otherRef', 'Other reference(s)'),
  F('iec', 'IEC code'), F('ad', 'AD code'), F('buyerOther', 'Buyer (if other than consignee)'),
  F('exporterBlock', 'Exporter (name + address lines)', { rows: 4, wide: true }),
  F('exporterZip', 'Exporter zip'), F('exporterCountry', 'Exporter country'),
  F('exporterContact', 'Exporter contact person'), F('exporterTel', 'Exporter tel'),
  F('exporterEmail', 'Exporter e-mail'),
  F('consigneeBlock', 'Consignee (name + address lines)', { rows: 5, wide: true }),
  F('consigneeZip', 'Consignee zip'), F('consigneeCountry', 'Consignee country'),
  F('consigneeContact', 'Consignee contact person'), F('consigneeTel', 'Consignee tel'),
  F('consigneeEmail', 'Consignee e-mail'),
  F('originCountry', 'Country of origin'), F('destCountry', 'Country of final destination'),
  F('preCarriage', 'Pre-carriage by'), F('placeOfReceipt', 'Place of receipt'),
  F('vessel', 'Vessel / flight'), F('portLoading', 'Port of loading'),
  F('portDischarge', 'Port of discharge'), F('finalDest', 'Final destination'),
  F('termsDelivery', 'Terms of delivery'), F('paymentTerms', 'Payment terms'),
  F('marks', 'Marks & no. of packages'),
  F('goodsDesc', 'Descriptions (one per line)', { rows: 3 }),
  F('goodsQty', 'Quantities (one per line)', { rows: 3 }),
  F('goodsRemarks', 'Remarks / amounts (one per line)', { rows: 3 }),
  F('totalRemark', 'Total'),
  F('netWt', 'Net weight (KGS)'), F('grsWt', 'Gross weight (KGS)'), F('dimWt', 'Dimensional weight'),
  F('exporterName', 'Signatory company'),
  F('declaration', 'Declaration', { rows: 2, wide: true }),
];

const sliFields = [
  F('shipper', 'Shipper name'), F('consignee', 'Consignee name'),
  F('invoiceNo', 'Invoice no'), F('invoiceDate', 'Invoice date'),
  F('awb', 'DHL AWB number'), F('iec', 'IE code'), F('branch', 'IEC branch code'),
  F('pan', 'PAN'), F('gstin', 'GSTIN cell'),
  F('igstA', 'IGST option A'), F('igstB', 'IGST option B (LUT)'),
  F('igstC', 'IGST option C', { rows: 4 }),
  F('adCode', 'Bank AD code'), F('incoterms', 'Incoterms'), F('nature', 'Nature of payment'),
  F('fob', 'FOB value'), F('freight', 'Freight'), F('insurance', 'Insurance'),
  F('commission', 'Commission'), F('discount', 'Discount'), F('packing', 'Packing charges'),
  F('pkgs', 'No. of packages'), F('net', 'Net wt (KGS)'), F('gross', 'Gross wt (KGS)'),
  F('state', 'State of origin'), F('district', 'District of origin'),
  F('pta', 'Export under PTA/FTA', { wide: true }),
  F('special', 'Special instructions', { rows: 2, wide: true }),
  ...SB_TYPES.map(([l, label]) => F(`sb${l}`, `Shipping bill ${l}) ${label}`)),
  ...SLI_DOCS.map(([k, label]) => F(`tick_${k}`, label, { check: true })),
];

const annexureFields = [
  F('shippingBill', 'Shipping bill no. & date'),
  F('invoiceRef', 'Invoice no. & date'),
  F('nature', 'Nature of transaction', { options: ['Sale', 'Sale on consignment', 'Gift', 'Sample', 'Other'] }),
  F('valuationRule', 'Method of valuation', { options: ['', 'Rule 3', 'Rule 4', 'Rule 5', 'Rule 6'] }),
  F('related', 'Seller and buyer related?', { options: ['No', 'Yes'] }),
  F('influenced', 'Relationship influenced price?', { options: ['No', 'Yes'] }),
  F('termsPayment', 'Terms of payment'), F('termsDelivery', 'Terms of delivery'),
  F('previousExport', 'Previous export (SB no. & date)'), F('otherInfo', 'Other information'),
  F('place', 'Place'), F('date', 'Date'),
  F('company', 'Company name'), F('designation', 'Designation'),
];

const scometFields = [
  F('toBlock', 'Addressee', { rows: 4, wide: true }),
  F('invoiceRef', 'Invoice reference', { wide: true }),
  F('body', 'Letter text (blank line = new paragraph)', { rows: 12, wide: true }),
  F('company', 'Company name'),
];

const selfDeclFields = [
  F('date', 'Date'), F('awbNo', 'AWB No'),
  F('recipientName', 'Recipient Name'), F('recipientCountry', 'Destination Country'),
  F('shipperName', 'Shipper Name', { wide: true }), F('shipperAddress', 'Shipper Address', { rows: 3, wide: true }),
  F('shipperMobile', 'Shipper Mobile'), F('aadharNo', 'Aadhaar No'),
  F('recipientAddress', 'Recipient Address', { rows: 3, wide: true }),
  F('recipientCity', 'Recipient City'), F('recipientMobile', 'Recipient Mobile'),
];

const indemnityFields = [
  F('date', 'Date'), F('companyName', 'Company Name', { wide: true }),
  F('awbNo', 'AWB No'), F('contents', 'Contents', { rows: 3, wide: true }),
];


/* =============== REGISTRY =============== */
export const EXTRA_DOCS = [
  { id: 'packing', label: 'Packing List', file: 'Packing-List', build: buildPackingListDefaults,
    fields: packingFields, Sheet: PackingListSheet, side: 12, margins: { top: 12, bottom: 10 }, letterhead: false },
  { id: 'sli', label: 'DHL SLI', file: 'DHL-SLI', build: buildSliDefaults,
    fields: sliFields, Sheet: SliSheet, side: 6, margins: { top: 8, bottom: 8 }, letterhead: false },
  { id: 'annexure', label: 'Annexure-A', file: 'Annexure-A', build: buildAnnexureDefaults,
    fields: annexureFields, Sheet: AnnexureSheet, side: 20, margins: { top: 20, bottom: 15 }, letterhead: true },
  { id: 'scomet', label: 'Non-SCOMET Declaration', file: 'Non-SCOMET-Declaration', build: buildNonScometDefaults,
    fields: scometFields, Sheet: NonScometSheet, side: 25, margins: { top: 20, bottom: 15 }, letterhead: true },
    
  // --- NEW DOCUMENTS ---
  { id: 'self_decl', label: 'Shipper Self Declaration', file: 'Shipper-Self-Declaration', 
    build: (data) => {
      const consignor = data.consignorDetails || {};
      const consignee = data.consigneeDetails || {};
      return {
        date: data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
        awbNo: data.awbNo || '',
        recipientName: consignee.name || '',
        recipientCountry: consignee.country || '',
        shipperName: consignor.company || '',
        shipperAddress: `${consignor.address || ''} ${consignor.building || ''} ${consignor.area || ''}, ${consignor.city || ''} - ${consignor.pin || ''}`,
        shipperMobile: consignor.phone || '',
        aadharNo: consignor.idType === 'aadhaar' ? consignor.aadhaar : '',
        recipientAddress: consignee.address || '',
        recipientCity: consignee.city || '',
        recipientMobile: consignee.phone || '',
      
      };
    },
    fields: selfDeclFields, Sheet: SelfDeclarationSheet, side: 15, margins: { top: 20, bottom: 20 }, letterhead: true },

  { id: 'indemnity', label: 'Indemnity Letter', file: 'Indemnity-Fragile',
    build: (data) => {
      const consignor = data.consignorDetails || {};
      const goods = (data.items || []).map((i, idx) => `${idx + 1}) ${i.description}`).join(' ');
      return {
        date: data.invoiceDate ? new Date(data.invoiceDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
        companyName: consignor.company || '',
        awbNo: data.awbNo || '',
        contents: goods || 'FRAGILE GOODS',
      };
    },
    fields: indemnityFields, Sheet: IndemnitySheet, side: 20, margins: { top: 20, bottom: 20 }, letterhead: true },
];