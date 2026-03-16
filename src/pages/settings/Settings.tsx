import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { Building2, Palette, Database, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockClients, mockCarers, mockShifts, mockInvoices, mockCarePlans, mockNdisRates, mockDocuments } from '@/data/mockData';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'business' | 'display' | 'data'>('business');

  const tabs = [
    { id: 'business' as const, label: 'Business Details', icon: Building2 },
    { id: 'display' as const, label: 'Display', icon: Palette },
    { id: 'data' as const, label: 'Data Management', icon: Database },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-forest text-white'
                  : 'bg-white text-mid-gray hover:bg-sage-pale border border-sage-pale'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'business' && <BusinessSettings />}
      {activeTab === 'display' && <DisplaySettings />}
      {activeTab === 'data' && <DataSettings />}
    </div>
  );
}

function BusinessSettings() {
  return (
    <div className="card space-y-6">
      <h3 className="text-lg font-semibold text-charcoal">Business Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Business Name</label>
          <input type="text" defaultValue="Thrive 4 Better Pty Ltd" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">ABN</label>
          <input type="text" defaultValue="12 345 678 901" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">NDIS Registration Number</label>
          <input type="text" defaultValue="4-XXXXXXX" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
          <input type="text" defaultValue="03 9123 4567" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
          <input type="email" defaultValue="admin@thrive4better.com.au" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Website</label>
          <input type="text" defaultValue="www.thrive4better.com.au" className="input-field" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-charcoal mb-1">Address</label>
          <input type="text" defaultValue="123 Smith Street, Fitzroy VIC 3065" className="input-field" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-charcoal pt-4">Bank Details (for Invoices)</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">BSB</label>
          <input type="text" defaultValue="063-123" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Account Number</label>
          <input type="text" defaultValue="1234 5678" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Account Name</label>
          <input type="text" defaultValue="Thrive 4 Better Pty Ltd" className="input-field" />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button className="btn-primary" onClick={() => toast.success('Settings saved')}>Save Changes</button>
      </div>
    </div>
  );
}

function DisplaySettings() {
  return (
    <div className="card space-y-6">
      <h3 className="text-lg font-semibold text-charcoal">Display Preferences</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Date Format</label>
          <select className="input-field w-48" defaultValue="DD/MM/YYYY">
            <option>DD/MM/YYYY</option>
          </select>
          <p className="text-xs text-mid-gray mt-1">Australian standard format</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Currency</label>
          <select className="input-field w-48" defaultValue="AUD">
            <option>AUD ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Default Invoice Payment Terms</label>
          <select className="input-field w-48" defaultValue="14">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Roster Week Start</label>
          <select className="input-field w-48" defaultValue="Monday">
            <option>Monday</option>
            <option>Sunday</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button className="btn-primary" onClick={() => toast.success('Display settings saved')}>Save Changes</button>
      </div>
    </div>
  );
}

function DataSettings() {
  const store = useStore();

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all data to default mock data? This cannot be undone.')) {
      localStorage.removeItem('thrive4better-storage');
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = {
      clients: store.clients,
      carers: store.carers,
      shifts: store.shifts,
      invoices: store.invoices,
      carePlans: store.carePlans,
      ndisRates: store.ndisRates,
      documents: store.documents,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thrive4better-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="text-lg font-semibold text-charcoal mb-2">Export Data</h3>
        <p className="text-sm text-mid-gray mb-4">Download all your data as a JSON file for backup.</p>
        <button className="btn-secondary" onClick={handleExportData}>Export All Data</button>
      </div>

      <div className="card border-red-200">
        <h3 className="text-lg font-semibold text-charcoal mb-2">Reset to Demo Data</h3>
        <p className="text-sm text-mid-gray mb-4">
          This will delete all your changes and restore the original mock data. This action cannot be undone.
        </p>
        <button className="btn-danger" onClick={handleResetData}>
          <RotateCcw size={16} />
          Reset All Data
        </button>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-charcoal mb-2">Storage Info</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between p-3 bg-sage-pale/50 rounded-lg">
            <span className="text-mid-gray">Clients</span>
            <span className="font-medium">{store.clients.length}</span>
          </div>
          <div className="flex justify-between p-3 bg-sage-pale/50 rounded-lg">
            <span className="text-mid-gray">Carers</span>
            <span className="font-medium">{store.carers.length}</span>
          </div>
          <div className="flex justify-between p-3 bg-sage-pale/50 rounded-lg">
            <span className="text-mid-gray">Shifts</span>
            <span className="font-medium">{store.shifts.length}</span>
          </div>
          <div className="flex justify-between p-3 bg-sage-pale/50 rounded-lg">
            <span className="text-mid-gray">Invoices</span>
            <span className="font-medium">{store.invoices.length}</span>
          </div>
          <div className="flex justify-between p-3 bg-sage-pale/50 rounded-lg">
            <span className="text-mid-gray">Care Plans</span>
            <span className="font-medium">{store.carePlans.length}</span>
          </div>
          <div className="flex justify-between p-3 bg-sage-pale/50 rounded-lg">
            <span className="text-mid-gray">NDIS Rates</span>
            <span className="font-medium">{store.ndisRates.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
