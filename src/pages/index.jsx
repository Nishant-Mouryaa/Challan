import Link from 'next/link';
import styles from '../styles/form.module.css';

export default function Home() {
  return (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h1>🎵 DC Challan Management System</h1>
        <p>Automated Delivery Challan Generator</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Create New Challan Card */}
        <div style={{ 
          padding: '2rem', 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, boxShadow 0.2s'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <h2>Create New Challan</h2>
          <p>Generate a new delivery challan with pre-filled client and sender details</p>
          <Link href="/create-challan">
            <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
              Create Challan
            </button>
          </Link>
        </div>

        {/* View Challans Card */}
        <div style={{ 
          padding: '2rem', 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, boxShadow 0.2s'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h2>View Challans</h2>
          <p>View, search, and manage all previously created delivery challans</p>
          <Link href="/view-challans">
            <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
              View All Challans
            </button>
          </Link>
        </div>

        {/* Management Card */}
        <div style={{ 
          padding: '2rem', 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, boxShadow 0.2s'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
          <h2>Manage Data</h2>
          <p>Manage clients, senders, and product catalogs</p>
          <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }} disabled>
            Coming Soon
          </button>
        </div>
      </div>
      {/* International Invoices Card */}
<div style={{ 
  padding: '2rem', 
  border: '1px solid #e0e0e0', 
  borderRadius: '8px',
  textAlign: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}>
  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌍</div>
  <h2>International Invoices</h2>
  <p>Generate international export invoices for shipments abroad</p>
  <Link href="/international-invoice">
    <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
      Create Invoice
    </button>
  </Link>
</div>

{/* View International Invoices Card */}
<div style={{ 
  padding: '2rem', 
  border: '1px solid #e0e0e0', 
  borderRadius: '8px',
  textAlign: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}>
  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
  <h2>View Invoices</h2>
  <p>Access, edit, and manage all international invoices</p>
  <Link href="/view-international-invoices">
    <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
      View All Invoices
    </button>
  </Link>
</div>

      {/* Features Section */}
      <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem', color: '#0066cc' }}>Key Features</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ paddingBottom: '0.75rem' }}>✅ Pre-filled sender details (Sennheiser ELECTRONICS INDIA PVT LTD)</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ Quick client selection from saved addresses</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ Product catalog with auto-fill pricing</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ Automatic calculation of totals and amount in words</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ A4-size optimized printing</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ PDF download capability</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ Unique challan numbering (DC-YYYYMMDD-XXXX)</li>
          <li style={{ paddingBottom: '0.75rem' }}>✅ Save and retrieve previous challans</li>
        </ul>
      </div>

      {/* Instructions Section */}
      <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem' }}>How to Use</h2>
        <ol style={{ paddingLeft: '2rem', lineHeight: '1.8' }}>
          <li><strong>Create Challan:</strong> Click "Create Challan" button to start a new delivery challan</li>
          <li><strong>Select Receiver:</strong> Choose a pre-saved client or enter custom receiver details</li>
          <li><strong>Add Products:</strong> Select products from catalog or enter manually with qty & price</li>
          <li><strong>Review:</strong> Click "Preview & Print" to see the final challan format</li>
          <li><strong>Print/Download:</strong> Print directly or download as PDF</li>
          <li><strong>Save:</strong> Click "Save Challan" to store the record for future reference</li>
        </ol>
      </div>
    </div>
  );
}