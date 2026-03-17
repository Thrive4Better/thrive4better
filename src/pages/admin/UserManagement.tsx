import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SlideOver from '@/components/ui/SlideOver';
import { UserPlus, Link, Unlink, ChevronDown, Shield, Power, Check } from 'lucide-react';
import type { UserRole } from '@/types';
import {
  ALL_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  PERMISSION_GROUPS,
  ROLE_DEFAULTS,
  type Permission,
} from '@/lib/permissions';
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
  is_active: boolean;
  permissions: Permission[] | null;
}

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-burgundy/10 text-burgundy',
  manager: 'bg-blue-100 text-blue-800',
  staff: 'bg-sage-pale text-forest',
};

async function callManageUser(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/manage-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export default function UserManagement() {
  const { user } = useAuth();
  const carers = useStore((s) => s.carers);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  // Invite form state
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('staff');
  const [invCarerId, setInvCarerId] = useState('');
  const [inviting, setInviting] = useState(false);

  // Permissions slide-over
  const [permTarget, setPermTarget] = useState<ProfileRow | null>(null);
  const [permRole, setPermRole] = useState<UserRole>('staff');
  const [permChecked, setPermChecked] = useState<Set<Permission>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  // Fetch profiles
  const fetchProfiles = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, full_name, role, carer_id, avatar_url, phone, created_at, is_active, permissions')
        .order('created_at', { ascending: false });

      if (signal?.aborted) return;

      if (queryError) {
        console.error('[UserManagement] Failed to load profiles:', queryError);
        setError('Failed to load users');
        toast.error('Failed to load users');
        setLoading(false);
        return;
      }
      // Normalize is_active to boolean (default true)
      const normalized = (data || []).map((p: any) => ({
        ...p,
        is_active: p.is_active !== false,
        permissions: p.permissions ?? null,
      }));
      setProfiles(normalized);
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

  // Toggle active/inactive
  const handleToggleActive = async (profile: ProfileRow) => {
    const action = profile.is_active ? 'deactivate' : 'activate';
    setTogglingStatus(profile.id);
    try {
      await callManageUser({ userId: profile.id, action });
      setProfiles((prev) =>
        prev.map((p) => (p.id === profile.id ? { ...p, is_active: !profile.is_active } : p))
      );
      toast.success(`User ${action}d`);
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action} user`);
    } finally {
      setTogglingStatus(null);
    }
  };

  // Open permissions slide-over
  const openPermissions = (profile: ProfileRow) => {
    setPermTarget(profile);
    setPermRole(profile.role);
    // If user has custom permissions, use those; otherwise use role defaults
    const existing = profile.permissions && profile.permissions.length > 0
      ? profile.permissions
      : ROLE_DEFAULTS[profile.role] ?? [];
    setPermChecked(new Set(existing));
  };

  // When role changes in the permissions panel, fill defaults
  const handlePermRoleChange = (newRole: UserRole) => {
    setPermRole(newRole);
    setPermChecked(new Set(ROLE_DEFAULTS[newRole] ?? []));
  };

  // Toggle single permission
  const togglePerm = (perm: Permission) => {
    setPermChecked((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  // Select/deselect all in a group
  const toggleGroup = (perms: Permission[], select: boolean) => {
    setPermChecked((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (select ? next.add(p) : next.delete(p)));
      return next;
    });
  };

  // Save permissions
  const handleSavePermissions = async () => {
    if (!permTarget) return;
    setSavingPerms(true);
    try {
      // Update role if changed
      if (permRole !== permTarget.role) {
        await callManageUser({ userId: permTarget.id, action: 'updateRole', role: permRole });
      }

      // Save permissions
      const permsArray = Array.from(permChecked);
      await callManageUser({ userId: permTarget.id, action: 'updatePermissions', permissions: permsArray });

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === permTarget.id
            ? { ...p, role: permRole, permissions: permsArray }
            : p
        )
      );
      toast.success('Permissions saved');
      setPermTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save permissions');
    } finally {
      setSavingPerms(false);
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

  // Check if current permissions match role defaults
  const isDefaultPerms = permTarget
    ? (() => {
        const defaults = new Set(ROLE_DEFAULTS[permRole] ?? []);
        return permChecked.size === defaults.size && [...permChecked].every((p) => defaults.has(p));
      })()
    : true;

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
                  <th className="table-header">Status</th>
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${profile.is_active ? 'bg-forest' : 'bg-mid-gray'}`}>
                            <span className="text-white text-xs font-semibold">
                              {(profile.full_name || '?')
                                .split(' ')
                                .slice(0, 2)
                                .map((s) => s[0]?.toUpperCase())
                                .join('')}
                            </span>
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${profile.is_active ? 'text-charcoal' : 'text-mid-gray'}`}>
                              {profile.full_name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-mid-gray">{profile.phone || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {profile.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Deactivated
                          </span>
                        )}
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
                        <div className="flex items-center gap-2">
                          {isSelf ? (
                            <span className="text-xs text-mid-gray italic">You</span>
                          ) : (
                            <>
                              {/* Activate / Deactivate toggle */}
                              <button
                                onClick={() => handleToggleActive(profile)}
                                disabled={togglingStatus === profile.id}
                                className={`p-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 ${
                                  profile.is_active
                                    ? 'hover:bg-red-50 text-red-600 hover:text-red-700'
                                    : 'hover:bg-green-50 text-green-600 hover:text-green-700'
                                } disabled:opacity-50`}
                                title={profile.is_active ? 'Deactivate user' : 'Activate user'}
                              >
                                <Power size={14} />
                                {togglingStatus === profile.id
                                  ? '...'
                                  : profile.is_active
                                  ? 'Deactivate'
                                  : 'Activate'}
                              </button>

                              {/* Edit Permissions */}
                              <button
                                onClick={() => openPermissions(profile)}
                                className="p-1.5 rounded-lg hover:bg-sage-pale text-forest transition-colors text-xs font-medium flex items-center gap-1"
                                title="Edit permissions"
                              >
                                <Shield size={14} />
                                Permissions
                              </button>
                            </>
                          )}
                        </div>
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

      {/* Permissions SlideOver */}
      <SlideOver
        open={!!permTarget}
        onClose={() => setPermTarget(null)}
        title={`Permissions: ${permTarget?.full_name || ''}`}
        wide
      >
        {permTarget && (
          <div className="space-y-5">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
              <select
                value={permRole}
                onChange={(e) => handlePermRoleChange(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
              <p className="text-xs text-mid-gray mt-1">
                Changing the role will reset permissions to defaults. You can then customize.
              </p>
            </div>

            {/* Custom override indicator */}
            {!isDefaultPerms && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-xs text-amber-800 font-medium">
                  Custom overrides active -- permissions differ from role defaults.
                </span>
                <button
                  onClick={() => setPermChecked(new Set(ROLE_DEFAULTS[permRole] ?? []))}
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >
                  Reset to defaults
                </button>
              </div>
            )}

            {/* Permission groups */}
            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const allChecked = group.permissions.every((p) => permChecked.has(p));
                const someChecked = group.permissions.some((p) => permChecked.has(p));
                return (
                  <div key={group.label} className="border border-sage-pale rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-sage-pale/30">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked && !allChecked;
                          }}
                          onChange={() => toggleGroup(group.permissions, !allChecked)}
                          className="rounded border-sage-pale text-forest focus:ring-forest/20"
                        />
                        <span className="text-sm font-semibold text-charcoal">{group.label}</span>
                      </label>
                      <span className="text-xs text-mid-gray">
                        {group.permissions.filter((p) => permChecked.has(p)).length}/{group.permissions.length}
                      </span>
                    </div>
                    <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.permissions.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-sage-pale/20 rounded px-1">
                          <input
                            type="checkbox"
                            checked={permChecked.has(perm)}
                            onChange={() => togglePerm(perm)}
                            className="rounded border-sage-pale text-forest focus:ring-forest/20"
                          />
                          <span className="text-sm text-charcoal">{ALL_PERMISSIONS[perm]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save */}
            <div className="sticky bottom-0 bg-white border-t border-sage-pale pt-4 pb-2 -mx-6 px-6">
              <button
                onClick={handleSavePermissions}
                disabled={savingPerms}
                className="btn-primary w-full justify-center disabled:opacity-50 flex items-center gap-2"
              >
                <Check size={16} />
                {savingPerms ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
