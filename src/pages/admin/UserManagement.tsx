import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SlideOver from '@/components/ui/SlideOver';
import { UserPlus, Link, Unlink, ChevronDown, Shield, Power, Check, Plus, Pencil, Trash2, Users, ShieldCheck } from 'lucide-react';
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

// ── Custom Role types & localStorage ──

interface CustomRole {
  id: string;
  name: string;
  isBuiltIn: boolean;
  permissions: Permission[];
}

const CUSTOM_ROLES_KEY = 't4b_customRoles';

const BUILT_IN_ROLES: CustomRole[] = [
  { id: 'admin', name: 'Admin', isBuiltIn: true, permissions: ROLE_DEFAULTS.admin },
  { id: 'manager', name: 'Manager', isBuiltIn: true, permissions: ROLE_DEFAULTS.manager },
  { id: 'staff', name: 'Staff', isBuiltIn: true, permissions: ROLE_DEFAULTS.staff },
  { id: 'client', name: 'Client', isBuiltIn: true, permissions: ROLE_DEFAULTS.client },
  { id: 'guest', name: 'Guest', isBuiltIn: true, permissions: ROLE_DEFAULTS.guest },
];

function loadCustomRoles(): CustomRole[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ROLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomRoles(roles: CustomRole[]) {
  localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
}

function getAllRoles(customRoles: CustomRole[]): CustomRole[] {
  return [...BUILT_IN_ROLES, ...customRoles];
}

// ── Profile & helpers ──

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
  client: 'bg-teal-100 text-teal-800',
  guest: 'bg-gray-100 text-gray-600',
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

type TabKey = 'users' | 'roles';

export default function UserManagement() {
  const { user } = useAuth();
  const carers = useStore((s) => s.carers);
  const clients = useStore((s) => s.clients);

  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  // Create user / invite form state
  const [invEmail, setInvEmail] = useState('');
  const [invFullName, setInvFullName] = useState('');
  const [invPhone, setInvPhone] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('guest');
  const [invCarerId, setInvCarerId] = useState('');
  const [invClientId, setInvClientId] = useState('');
  const [invPassword, setInvPassword] = useState('');
  const [invMethod, setInvMethod] = useState<'password' | 'invite'>('invite');
  const [inviting, setInviting] = useState(false);

  // Permissions slide-over
  const [permTarget, setPermTarget] = useState<ProfileRow | null>(null);
  const [permRole, setPermRole] = useState<UserRole>('staff');
  const [permChecked, setPermChecked] = useState<Set<Permission>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  // Custom roles state
  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => loadCustomRoles());
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormPerms, setRoleFormPerms] = useState<Set<Permission>>(new Set());
  const [showNewRole, setShowNewRole] = useState(false);

  const allRoles = getAllRoles(customRoles);

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

  // Open permissions slide-over -- now uses custom role defaults too
  const openPermissions = (profile: ProfileRow) => {
    setPermTarget(profile);
    setPermRole(profile.role);
    // If user has custom permissions, use those; otherwise use role defaults (including custom roles)
    const existing = profile.permissions && profile.permissions.length > 0
      ? profile.permissions
      : getPermissionsForRole(profile.role);
    setPermChecked(new Set(existing));
  };

  // Get permissions for a role (built-in or custom)
  const getPermissionsForRole = (role: string): Permission[] => {
    // Check built-in first
    if (ROLE_DEFAULTS[role as UserRole]) {
      return ROLE_DEFAULTS[role as UserRole];
    }
    // Check custom roles
    const custom = customRoles.find((r) => r.id === role);
    return custom ? custom.permissions : ROLE_DEFAULTS.staff;
  };

  // When role changes in the permissions panel, fill defaults
  const handlePermRoleChange = (newRole: UserRole) => {
    setPermRole(newRole);
    setPermChecked(new Set(getPermissionsForRole(newRole)));
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

  // Create user account or send invitation
  const handleInvite = async () => {
    if (!invEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!invFullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (invMethod === 'password' && invPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setInviting(true);
    try {
      // Determine the linked record id (carer_id is used for both client and carer linking)
      const linkedId = invRole === 'client' ? (invClientId || null) : (invCarerId || null);

      // Get default permissions for the selected role
      const defaultPerms = ROLE_DEFAULTS[invRole] || [];

      if (invMethod === 'password') {
        // Create user with password via the manage-user edge function
        await callManageUser({
          action: 'createUser',
          email: invEmail.trim().toLowerCase(),
          password: invPassword,
          fullName: invFullName.trim(),
          phone: invPhone.trim() || null,
          role: invRole,
          carerId: linkedId,
          permissions: defaultPerms,
        });
        toast.success(`Account created for ${invFullName.trim()}`);
      } else {
        // Create invitation record
        const token = generateId();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase.from('user_invitations').insert({
          id: generateId(),
          email: invEmail.trim().toLowerCase(),
          role: invRole,
          carer_id: linkedId,
          invited_by: user?.id,
          token,
          expires_at: expiresAt,
        });
        if (error) throw error;
        toast.success(`Invitation created for ${invFullName.trim()}`);
      }

      // Reset form
      setInvEmail('');
      setInvFullName('');
      setInvPhone('');
      setInvRole('guest');
      setInvCarerId('');
      setInvClientId('');
      setInvPassword('');
      setInvMethod('invite');
      setInviteOpen(false);

      // Refresh the profiles list
      fetchProfiles();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create user');
    } finally {
      setInviting(false);
    }
  };

  // Check if current permissions match role defaults
  const isDefaultPerms = permTarget
    ? (() => {
        const defaults = new Set(getPermissionsForRole(permRole));
        return permChecked.size === defaults.size && [...permChecked].every((p) => defaults.has(p));
      })()
    : true;

  // ── Role management helpers ──

  const openNewRole = () => {
    setShowNewRole(true);
    setEditingRole(null);
    setRoleFormName('');
    setRoleFormPerms(new Set(ROLE_DEFAULTS.staff)); // default to staff permissions as starting point
  };

  const openEditRole = (role: CustomRole) => {
    setEditingRole(role);
    setShowNewRole(false);
    setRoleFormName(role.name);
    setRoleFormPerms(new Set(role.permissions));
  };

  const handleSaveRole = () => {
    const name = roleFormName.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }

    // Check for duplicate names
    const existingNames = allRoles
      .filter((r) => r.id !== editingRole?.id)
      .map((r) => r.name.toLowerCase());
    if (existingNames.includes(name.toLowerCase())) {
      toast.error('A role with this name already exists');
      return;
    }

    const permsArray = Array.from(roleFormPerms);

    if (editingRole) {
      // Editing existing custom role
      const updated = customRoles.map((r) =>
        r.id === editingRole.id ? { ...r, name, permissions: permsArray } : r
      );
      setCustomRoles(updated);
      saveCustomRoles(updated);
      toast.success('Role updated');
      setEditingRole(null);
    } else {
      // Creating new role
      const newRole: CustomRole = {
        id: `custom_${generateId()}`,
        name,
        isBuiltIn: false,
        permissions: permsArray,
      };
      const updated = [...customRoles, newRole];
      setCustomRoles(updated);
      saveCustomRoles(updated);
      toast.success('Role created');
      setShowNewRole(false);
    }
    setRoleFormName('');
    setRoleFormPerms(new Set());
  };

  const handleDeleteRole = (roleId: string) => {
    const updated = customRoles.filter((r) => r.id !== roleId);
    setCustomRoles(updated);
    saveCustomRoles(updated);
    toast.success('Role deleted');
    if (editingRole?.id === roleId) {
      setEditingRole(null);
    }
  };

  const toggleRoleFormPerm = (perm: Permission) => {
    setRoleFormPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleRoleFormGroup = (perms: Permission[], select: boolean) => {
    setRoleFormPerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => (select ? next.add(p) : next.delete(p)));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">User Management</h1>
        {activeTab === 'users' && (
          <button onClick={() => setInviteOpen(true)} className="btn-primary">
            <UserPlus size={16} /> Create User
          </button>
        )}
        {activeTab === 'roles' && (
          <button onClick={openNewRole} className="btn-primary">
            <Plus size={16} /> Create Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-sage-pale">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-forest text-forest'
              : 'border-transparent text-mid-gray hover:text-charcoal hover:border-sage-pale'
          }`}
        >
          <Users size={16} />
          Users
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-forest text-forest'
              : 'border-transparent text-mid-gray hover:text-charcoal hover:border-sage-pale'
          }`}
        >
          <ShieldCheck size={16} />
          Roles
        </button>
      </div>

      {/* ═══════ USERS TAB ═══════ */}
      {activeTab === 'users' && (
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
                            <span className={`badge ${roleBadgeStyles[profile.role] || 'bg-purple-100 text-purple-800'}`}>{profile.role}</span>
                          ) : (
                            <div className="relative inline-block">
                              <select
                                value={profile.role}
                                onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                                className="appearance-none bg-transparent pr-6 pl-2 py-1 rounded-md border border-sage-pale text-sm text-charcoal cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest/20"
                              >
                                <option value="guest">guest</option>
                                <option value="client">client</option>
                                <option value="staff">staff</option>
                                <option value="manager">manager</option>
                                <option value="admin">admin</option>
                                {customRoles.map((cr) => (
                                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                                ))}
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
      )}

      {/* ═══════ ROLES TAB ═══════ */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* New role form */}
          {showNewRole && (
            <RoleFormCard
              title="Create New Role"
              roleName={roleFormName}
              onRoleNameChange={setRoleFormName}
              permissions={roleFormPerms}
              onTogglePerm={toggleRoleFormPerm}
              onToggleGroup={toggleRoleFormGroup}
              onSave={handleSaveRole}
              onCancel={() => {
                setShowNewRole(false);
                setRoleFormName('');
                setRoleFormPerms(new Set());
              }}
              isBuiltIn={false}
            />
          )}

          {/* Edit role form */}
          {editingRole && (
            <RoleFormCard
              title={`Edit Role: ${editingRole.name}`}
              roleName={roleFormName}
              onRoleNameChange={editingRole.isBuiltIn ? undefined : setRoleFormName}
              permissions={roleFormPerms}
              onTogglePerm={editingRole.isBuiltIn ? undefined : toggleRoleFormPerm}
              onToggleGroup={editingRole.isBuiltIn ? undefined : toggleRoleFormGroup}
              onSave={editingRole.isBuiltIn ? undefined : handleSaveRole}
              onCancel={() => {
                setEditingRole(null);
                setRoleFormName('');
                setRoleFormPerms(new Set());
              }}
              isBuiltIn={editingRole.isBuiltIn}
            />
          )}

          {/* Role list */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-mid-gray uppercase tracking-wide">Built-in Roles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BUILT_IN_ROLES.map((role) => (
                <div
                  key={role.id}
                  className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openEditRole(role)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${roleBadgeStyles[role.id] || 'bg-sage-pale text-forest'}`}>
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{role.name}</p>
                        <p className="text-xs text-mid-gray">Built-in</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-mid-gray">
                    {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>

            {customRoles.length > 0 && (
              <>
                <h2 className="text-sm font-semibold text-mid-gray uppercase tracking-wide mt-6">Custom Roles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {customRoles.map((role) => (
                    <div
                      key={role.id}
                      className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 text-purple-700">
                            <Shield size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-charcoal">{role.name}</p>
                            <p className="text-xs text-mid-gray">Custom</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditRole(role)}
                            className="p-1 rounded hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors"
                            title="Edit role"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-1 rounded hover:bg-red-50 text-mid-gray hover:text-burgundy transition-colors"
                            title="Delete role"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-mid-gray">
                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {customRoles.length === 0 && !showNewRole && (
              <div className="text-center py-8 border border-dashed border-sage-pale rounded-xl">
                <ShieldCheck size={28} className="mx-auto text-sage mb-2" />
                <p className="text-sm text-mid-gray mb-3">No custom roles yet</p>
                <button onClick={openNewRole} className="btn-secondary text-sm">
                  <Plus size={14} /> Create your first custom role
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create User SlideOver */}
      <SlideOver open={inviteOpen} onClose={() => setInviteOpen(false)} title="Create User Account" wide>
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Full Name *</label>
            <input
              type="text"
              value={invFullName}
              onChange={(e) => setInvFullName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email Address *</label>
            <input
              type="email"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
            <input
              type="tel"
              value={invPhone}
              onChange={(e) => setInvPhone(e.target.value)}
              placeholder="04XX XXX XXX"
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              <option value="guest">Guest (No Access)</option>
              <option value="client">Client</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              {customRoles.map((cr) => (
                <option key={cr.id} value={cr.id}>{cr.name}</option>
              ))}
            </select>
            <p className="text-xs text-mid-gray mt-1">
              {invRole === 'guest'
                ? 'Guest accounts have no access until permissions are granted.'
                : `Default ${invRole} permissions will be applied. You can customise later.`}
            </p>
          </div>

          {/* Link to Client record (shown when role is client) */}
          {invRole === 'client' && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Link to Client Record
              </label>
              <select
                value={invClientId}
                onChange={(e) => setInvClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.ndisNumber || 'No NDIS'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-mid-gray mt-1">
                Links this login to an existing client record so they can see their care plan and shifts.
              </p>
            </div>
          )}

          {/* Link to Carer record (shown when role is staff/manager/admin) */}
          {invRole !== 'client' && invRole !== 'guest' && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Link to Carer Record (optional)
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
          )}

          {/* Account creation method */}
          <div className="border-t border-sage-pale pt-4">
            <label className="block text-sm font-medium text-charcoal mb-2">Account Setup Method</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="invMethod"
                  value="invite"
                  checked={invMethod === 'invite'}
                  onChange={() => setInvMethod('invite')}
                  className="text-forest focus:ring-forest/20"
                />
                <span className="text-sm text-charcoal">Send invite email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="invMethod"
                  value="password"
                  checked={invMethod === 'password'}
                  onChange={() => setInvMethod('password')}
                  className="text-forest focus:ring-forest/20"
                />
                <span className="text-sm text-charcoal">Set initial password</span>
              </label>
            </div>
          </div>

          {/* Password field (only shown when setting password) */}
          {invMethod === 'password' && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Initial Password *</label>
              <input
                type="password"
                value={invPassword}
                onChange={(e) => setInvPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
              <p className="text-xs text-mid-gray mt-1">
                The user can change this after their first login.
              </p>
            </div>
          )}

          {/* Role permissions preview */}
          <div className="border border-sage-pale rounded-lg p-3 bg-sage-pale/10">
            <p className="text-xs font-semibold text-charcoal mb-2">Default Permissions for {invRole}</p>
            {(ROLE_DEFAULTS[invRole] || []).length === 0 ? (
              <p className="text-xs text-mid-gray italic">No permissions (blank slate). Configure after creation.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {(ROLE_DEFAULTS[invRole] || []).map((perm) => (
                  <span key={perm} className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-sage-pale text-charcoal">
                    {ALL_PERMISSIONS[perm]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !invEmail.trim() || !invFullName.trim()}
              className="btn-primary w-full justify-center disabled:opacity-50 flex items-center gap-2"
            >
              <UserPlus size={16} />
              {inviting
                ? 'Creating...'
                : invMethod === 'password'
                  ? 'Create Account'
                  : 'Send Invitation'}
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
                <option value="guest">Guest (No Access)</option>
                <option value="client">Client</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                {customRoles.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
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
                  onClick={() => setPermChecked(new Set(getPermissionsForRole(permRole)))}
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

// ── Role Form Card (used for both create & edit) ──

interface RoleFormCardProps {
  title: string;
  roleName: string;
  onRoleNameChange?: (name: string) => void;
  permissions: Set<Permission>;
  onTogglePerm?: (perm: Permission) => void;
  onToggleGroup?: (perms: Permission[], select: boolean) => void;
  onSave?: () => void;
  onCancel: () => void;
  isBuiltIn: boolean;
}

function RoleFormCard({
  title,
  roleName,
  onRoleNameChange,
  permissions,
  onTogglePerm,
  onToggleGroup,
  onSave,
  onCancel,
  isBuiltIn,
}: RoleFormCardProps) {
  return (
    <div className="card p-6 border-2 border-forest/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
        <button onClick={onCancel} className="text-sm text-mid-gray hover:text-charcoal">
          Close
        </button>
      </div>

      {/* Role name */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-1">Role Name</label>
        {onRoleNameChange ? (
          <input
            type="text"
            value={roleName}
            onChange={(e) => onRoleNameChange(e.target.value)}
            placeholder="e.g. Team Lead, Coordinator..."
            className="w-full px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        ) : (
          <p className="px-3 py-2 text-sm text-charcoal bg-sage-pale/30 rounded-lg">{roleName}</p>
        )}
      </div>

      {isBuiltIn && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-blue-800">
            Built-in roles cannot be edited or deleted. These are the default permissions for this role.
          </p>
        </div>
      )}

      {/* Permissions */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        <p className="text-sm font-medium text-charcoal">Default Permissions</p>
        {PERMISSION_GROUPS.map((group) => {
          const allChecked = group.permissions.every((p) => permissions.has(p));
          const someChecked = group.permissions.some((p) => permissions.has(p));
          return (
            <div key={group.label} className="border border-sage-pale rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-sage-pale/30">
                <label className={`flex items-center gap-2 ${onToggleGroup ? 'cursor-pointer' : ''}`}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={() => onToggleGroup?.(group.permissions, !allChecked)}
                    disabled={!onToggleGroup}
                    className="rounded border-sage-pale text-forest focus:ring-forest/20 disabled:opacity-50"
                  />
                  <span className="text-sm font-semibold text-charcoal">{group.label}</span>
                </label>
                <span className="text-xs text-mid-gray">
                  {group.permissions.filter((p) => permissions.has(p)).length}/{group.permissions.length}
                </span>
              </div>
              <div className="px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.permissions.map((perm) => (
                  <label key={perm} className={`flex items-center gap-2 py-1 rounded px-1 ${onTogglePerm ? 'cursor-pointer hover:bg-sage-pale/20' : ''}`}>
                    <input
                      type="checkbox"
                      checked={permissions.has(perm)}
                      onChange={() => onTogglePerm?.(perm)}
                      disabled={!onTogglePerm}
                      className="rounded border-sage-pale text-forest focus:ring-forest/20 disabled:opacity-50"
                    />
                    <span className="text-sm text-charcoal">{ALL_PERMISSIONS[perm]}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {onSave && (
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-sage-pale">
          <button onClick={onCancel} className="btn-ghost text-sm">
            Cancel
          </button>
          <button onClick={onSave} className="btn-primary text-sm">
            <Check size={14} />
            {isBuiltIn ? 'Done' : 'Save Role'}
          </button>
        </div>
      )}
    </div>
  );
}
