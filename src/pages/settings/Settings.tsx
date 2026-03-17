import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Building2, Palette, Database, RotateCcw, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
// mockData import removed - data reset uses localStorage clear

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'business' | 'display' | 'data'>('profile');

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Security', icon: Lock },
    { id: 'business' as const, label: 'Business Details', icon: Building2 },
    { id: 'display' as const, label: 'Display', icon: Palette },
    { id: 'data' as const, label: 'Data Management', icon: Database },
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex gap-2 mb-6 flex-wrap">
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

      {activeTab === 'profile' && <ProfileSettings />}
      {activeTab === 'security' && <SecuritySettings />}
      {activeTab === 'business' && <BusinessSettings />}
      {activeTab === 'display' && <DisplaySettings />}
      {activeTab === 'data' && <DataSettings />}
    </div>
  );
}

function ProfileSettings() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to update profile: ' + error.message);
      } else {
        await refreshProfile();
        toast.success('Profile updated successfully');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-6">
      <h3 className="text-lg font-semibold text-charcoal">User Profile</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="input-field bg-sage-pale/30 text-mid-gray cursor-not-allowed"
          />
          <p className="text-xs text-mid-gray mt-1">Email cannot be changed here</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            placeholder="04xx xxx xxx"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
          <input
            type="text"
            value={profile?.role || 'staff'}
            disabled
            className="input-field bg-sage-pale/30 text-mid-gray cursor-not-allowed capitalize"
          />
          <p className="text-xs text-mid-gray mt-1">Contact an admin to change your role</p>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error('Failed to change password: ' + updateError.message);
      } else {
        toast.success('Password changed successfully');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-6">
      <h3 className="text-lg font-semibold text-charcoal">Change Password</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
            className="input-field"
            placeholder="Enter new password"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            className="input-field"
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
      <div className="flex justify-end pt-4">
        <button
          className="btn-primary"
          onClick={handleChangePassword}
          disabled={saving || !newPassword || !confirmPassword}
        >
          {saving ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      <div className="border-t border-sage-pale pt-6 mt-6">
        <h4 className="text-sm font-semibold text-charcoal mb-2">Session Security</h4>
        <p className="text-sm text-mid-gray">
          Your session will automatically expire after 30 minutes of inactivity. You will receive a warning at 25 minutes.
        </p>
      </div>
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
