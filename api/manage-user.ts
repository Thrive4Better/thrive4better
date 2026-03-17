import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .end();
  }

  // Set CORS headers on all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract and verify JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const jwt = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Verify caller is authenticated
  const { data: { user: caller }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !caller) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - admin access required' });
  }

  try {
    const { userId, action, role, permissions } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'Missing required fields: userId, action' });
    }

    switch (action) {
      case 'activate': {
        // Unban user in auth
        const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        });
        if (authErr) {
          console.error('Failed to activate user in auth:', authErr);
          return res.status(500).json({ error: 'Failed to activate user', details: authErr.message });
        }

        // Update profile
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', userId);
        if (profileErr) {
          console.error('Failed to update profile:', profileErr);
          return res.status(500).json({ error: 'Failed to update profile', details: profileErr.message });
        }

        return res.status(200).json({ success: true, message: 'User activated' });
      }

      case 'deactivate': {
        // Prevent deactivating yourself
        if (userId === caller.id) {
          return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }

        // Ban user in auth (effectively preventing login)
        const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
          ban_duration: '876000h', // ~100 years
        });
        if (authErr) {
          console.error('Failed to deactivate user in auth:', authErr);
          return res.status(500).json({ error: 'Failed to deactivate user', details: authErr.message });
        }

        // Update profile
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', userId);
        if (profileErr) {
          console.error('Failed to update profile:', profileErr);
          return res.status(500).json({ error: 'Failed to update profile', details: profileErr.message });
        }

        return res.status(200).json({ success: true, message: 'User deactivated' });
      }

      case 'updateRole': {
        if (!role || !['admin', 'manager', 'staff'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }

        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', userId);
        if (profileErr) {
          console.error('Failed to update role:', profileErr);
          return res.status(500).json({ error: 'Failed to update role', details: profileErr.message });
        }

        return res.status(200).json({ success: true, message: 'Role updated' });
      }

      case 'updatePermissions': {
        if (!Array.isArray(permissions)) {
          return res.status(400).json({ error: 'permissions must be an array' });
        }

        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ permissions })
          .eq('id', userId);
        if (profileErr) {
          console.error('Failed to update permissions:', profileErr);
          return res.status(500).json({ error: 'Failed to update permissions', details: profileErr.message });
        }

        return res.status(200).json({ success: true, message: 'Permissions updated' });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
