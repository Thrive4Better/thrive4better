import { useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  MessageSquare,
  Shield,
  Save,
  Edit2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const { profile } = useAuth();
  const { clients, updateClient } = useStore();

  const myClientId = profile?.carerId || '';
  const client = useMemo(
    () => clients.find((c) => c.id === myClientId),
    [clients, myClientId],
  );

  const [editing, setEditing] = useState(false);
  const [preferences, setPreferences] = useState({
    notes: client?.notes || '',
    preferredCommunication: client?.preferredCommunication || 'phone',
  });

  if (!client) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <User size={48} className="mx-auto text-mid-gray mb-4" />
          <p className="text-mid-gray">Your profile could not be found. Please contact support.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updateClient(client.id, {
        notes: preferences.notes,
        preferredCommunication: preferences.preferredCommunication as 'phone' | 'email' | 'text',
      });
      setEditing(false);
      toast.success('Preferences updated');
    } catch (err) {
      toast.error('Failed to update preferences');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">My Profile</h1>
        <p className="text-sm text-mid-gray mt-1">View your details and update your preferences</p>
      </div>

      {/* Personal Details (read-only) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center gap-2">
          <User size={18} className="text-forest" />
          <h2 className="font-semibold text-charcoal">Personal Details</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Full Name</label>
              <p className="text-sm text-charcoal mt-1">{client.firstName} {client.lastName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Date of Birth</label>
              <p className="text-sm text-charcoal mt-1">{client.dateOfBirth ? formatDate(client.dateOfBirth) : '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">NDIS Number</label>
              <p className="text-sm text-charcoal mt-1">{client.ndisNumber || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Status</label>
              <p className="text-sm text-charcoal mt-1">{client.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Details (read-only) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center gap-2">
          <Phone size={18} className="text-forest" />
          <h2 className="font-semibold text-charcoal">Contact Details</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-mid-gray" />
              <div>
                <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Phone</label>
                <p className="text-sm text-charcoal">{client.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-mid-gray" />
              <div>
                <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Email</label>
                <p className="text-sm text-charcoal">{client.email || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 col-span-full">
              <MapPin size={14} className="text-mid-gray mt-0.5" />
              <div>
                <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Address</label>
                <p className="text-sm text-charcoal">
                  {[client.address, client.suburb, client.postcode].filter(Boolean).join(', ') || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contacts (read-only) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center gap-2">
          <Shield size={18} className="text-burgundy" />
          <h2 className="font-semibold text-charcoal">Emergency Contact</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Name</label>
              <p className="text-sm text-charcoal mt-1">{client.emergencyContactName || '-'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">Phone</label>
              <p className="text-sm text-charcoal mt-1">{client.emergencyContactPhone || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences (editable) */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-sage-pale bg-sage-pale/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-forest" />
            <h2 className="font-semibold text-charcoal">My Preferences</h2>
          </div>
          {!editing ? (
            <button
              onClick={() => {
                setPreferences({
                  notes: client.notes || '',
                  preferredCommunication: client.preferredCommunication || 'phone',
                });
                setEditing(true);
              }}
              className="btn-ghost text-sm flex items-center gap-1"
            >
              <Edit2 size={14} />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="btn-ghost text-sm flex items-center gap-1"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <Save size={14} />
                Save
              </button>
            </div>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">
              Communication Preference
            </label>
            {editing ? (
              <select
                value={preferences.preferredCommunication}
                onChange={(e) => setPreferences((p) => ({ ...p, preferredCommunication: e.target.value as 'phone' | 'email' | 'text' }))}
                className="input mt-1"
              >
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="text">Text / SMS</option>
              </select>
            ) : (
              <p className="text-sm text-charcoal mt-1 capitalize">{client.preferredCommunication}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-mid-gray uppercase tracking-wider">
              Interests, Likes & Preferences
            </label>
            {editing ? (
              <textarea
                value={preferences.notes}
                onChange={(e) => setPreferences((p) => ({ ...p, notes: e.target.value }))}
                rows={4}
                className="input mt-1"
                placeholder="Share your interests, favourite activities, likes and dislikes..."
              />
            ) : (
              <p className="text-sm text-charcoal mt-1 whitespace-pre-wrap">
                {client.notes || 'No preferences set yet. Click Edit to add yours.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
