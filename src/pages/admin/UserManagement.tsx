import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SlideOver from '@/components/ui/SlideOver';
import { UserPlus, Link, Unlink, ChevronDown } from 'lucide-react';
import type { UserRole } from '@/types';
import toast from 'react-hot-toast';
import { generateId } from '@/lib/utils';

interface ProfileRow {
  id: string;
  full_name: string;
  role: UserRole;
  carer_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  email?: string;
}

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-burgundy/10 text-burgundy',
  manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-sage-pale text-forest',
};

export default function UserManagement() {
  const { user } = useAuth();
  const carers = useStore((s) => s.carers);

  console.log('[UserManagement] Rendering, user:', user?.id, 'carers:', carers.length);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Invite form state
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('staff');
  const [invCarerId, setInvCarerId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Fetch profiles
  const fetchProfiles = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, full_name, role, carer_id, avatar_url, phone, created_at')
        .order('created_at', { ascending: false });

      if (signal?.aborted) return;

      if (queryError) {
        console.error('[UserManagement] Failed to load profiles:', queryError);
        setError('Failed to load users');
        toast.error('Failed to load users');
        setLoading(false);
        return;
      }
      setProfiles(data || []);
      setLoading(false);
    } catch (err) {
      if (signal?.aborted) return;
      console.error('[UserManagement] Unexpected error loading profiles:', err);
      setError('Failed to load users');
      toast.error('Failed to load users');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProfiles(controller.signal);
    return () => controller.abort();
  }, [fetchProfiles]);

  // Linked carer IDs for the "unlinked carers" dropdown
  const linkedCarerIds = new Set(profiles.map((p) => p.carer_id).filter(Boolean));
  const unlinkedCarers = carers.filter((c) => !linkedCarerIds.has(c.id));

  const getCarerName = (carerId: string | null) => {
    if (!carerId) return '-';
    const c = carers.find((cr) => cr.id === carerId);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  // Role change
  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', profileId);
      if (error) throw error;
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p))
      );
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  // Link carer
  const handleLinkCarer = async (profileId: string, carerId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ carer_id: carerId || null })
        .eq('id', profileId);
      if (error) throw error;
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, carer_id: carerId || null } : p))
      );
      toast.success(carerId ? 'Carer linked' : 'Carer unlinked');
    } catch {
      toast.error('Failed to update carer link');
    }
  };

  // Invite user
  const handleInvite = async () => {
    if (!invEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    setInviting(true);
    try {
      const token = generateId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from('user_invitations').insert({
        id: generateId(),
        email: invEmail.trim().toLowerCase(),
        role: invRole,
        carer_id: invCarerId || null,
        invited_by: user?.id,
        token,
        expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success(`Invitation created for ${invEmail}`);
      setInvEmail('');
      setInvRole('staff');
      setInvCarerId('');
      setInviteOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">User Management</h1>
        <button onClick={() => setInviteOpen(true)} className="btn-primary">
          <UserPlus size={16} /> Invite User
        </button>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-forest" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-burgundy mb-3">{error}</p>
            <button onClick={() => fetchProfiles()} className="btn-secondary text-sm">
              Retry
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-mid-gray py-8 text-center">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sage-pale">
                  <th className="table-header">Name</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Linked Carer</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const isSelf = profile.id === user?.id;
                  return (
                    <tr key={profile.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {(profile.full_name || '?')
                                .split(' ')
                                .slice(0, 2)
                                .map((s) => s[0]?.toUpperCase())
                                .join('')}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-charcoal">{profile.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-mid-gray">{profile.phone || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {isSelf ? (
                          <span className={`badge ${roleBadgeStyles[profile.role]}`}>{profile.role}</span>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={profile.role}
                              onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                              className="appearance-none bg-transparent pr-6 pl-2 py-1 rounded-md border border-sage-pale text-sm text-charcoal cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest/20"
                            >
                              <option value="admin">admin</option>
                              <option value="manager">manager</option>
                              <option value="staff">staff</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-mid-gray pointer-events-none" />
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        {profile.carer_id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-charcoal">{getCarerName(profile.carer_id)}</span>
                            {!isSelf && (
                              <button
                                onClick={() => handleLinkCarer(profile.id, '')}
                                className="p-1 rounded hover:bg-red-50 text-mid-gray hover:text-burgundy transition-colors"
                                title="Unlink carer"
                              >
                                <Unlink size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-mid-gray">-</span>
                            {!isSelf && unlinkedCarers.length > 0 && (
                              <div className="relative inline-block">
                                <select
                                  value=""
                                  onChange={(e) => handleLinkCarer(profile.id, e.target.value)}
                                  className="appearance-none bg-transparent pl-1 pr-5 py-1 rounded-md border border-sage-pale text-xs text-forest cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest/20"
                                >
                                  <option value="" disabled>Link...</option>
                                  {unlinkedCarers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.firstName} {c.lastName}
                                    </option>
                                  ))}
                                </select>
                                <Link size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-forest pointer-events-none" />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="table-cell text-sm text-mid-gray">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-AU') : '-'}
                      </td>
                      <td className="table-cell">
                        {isSelf && (
                          <span className="text-xs text-mid-gray italic">You</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite SlideOver */}
      <SlideOver open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email address</label>
            <input
              type="email"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Link to Carer (optional)
            </label>
            <select
              value={invCarerId}
              onChange={(e) => setInvCarerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              <option value="">No carer linked</option>
              {carers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-4">
            <button
              onClick={handleInvite}
              disabled={inviting || !invEmail.trim()}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {inviting ? 'Creating invitation...' : 'Send Invitation'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
