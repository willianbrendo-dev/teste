import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { mapToSafeError } from '../_shared/error-handler.ts';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  // Default allowed origins
  return [
    'https://uisvtoooeutqmklgbkxy.supabase.co',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
};

const getCorsHeaders = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) 
    ? requestOrigin 
    : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true'
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the JWT and get the user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !currentUser) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', currentUser.id);

    // Check if current user is admin using RPC
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'admin'
    });

    if (adminCheckError || !isAdmin) {
      console.error('Admin check error:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin check passed for user:', currentUser.id);

    // Get the user ID to delete from request body
    const deleteUserSchema = z.object({
      userId: z.string().uuid('Invalid user ID format')
    });

    const requestBody = await req.json();
    const validationResult = deleteUserSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error.errors[0].message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = validationResult.data;

    // Check if trying to delete a super admin
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .maybeSingle();

    if (targetProfile?.is_super_admin) {
      console.log('Attempt to delete super admin blocked:', userId);
      return new Response(
        JSON.stringify({ error: 'Cannot delete super admin user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the last admin
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles && adminRoles.length === 1 && adminRoles[0].user_id === userId) {
      console.log('Attempt to delete last admin blocked:', userId);
      return new Response(
        JSON.stringify({ error: 'Cannot delete the last admin user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deleting user from auth.users:', userId);

    // Delete user from auth.users - this will cascade delete:
    // - profiles (via foreign key on delete cascade)
    // - user_roles (via foreign key on delete cascade)
    // - user_permissions (via foreign key on delete cascade)
    // - Any other tables with foreign keys to auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      const safeError = mapToSafeError(deleteError);
      return new Response(
        JSON.stringify(safeError),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const safeError = mapToSafeError(error);
    return new Response(
      JSON.stringify(safeError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
