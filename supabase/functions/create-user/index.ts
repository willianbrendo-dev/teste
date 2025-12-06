import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { mapToSafeError } from '../_shared/error-handler.ts';

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string()
    .email('Formato de email inválido')
    .max(255, 'Email muito longo (máximo 255 caracteres)'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial'),
  nome: z.string()
    .trim()
    .min(1, 'Nome não pode estar vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s'_-]+$/, 'Nome contém caracteres inválidos'),
  role: z.enum(['admin', 'atendente', 'print_bridge'], {
    errorMap: () => ({ message: 'Role inválida. Deve ser "admin", "atendente" ou "print_bridge"' })
  })
});

// Get allowed origins from environment or use defaults
const getAllowedOrigins = () => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  // Default allowed origins - includes production domains
  return [
    'https://uisvtoooeutqmklgbkxy.supabase.co',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
};

const getCorsHeaders = (requestOrigin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow all Lovable domains and Supabase domains in production
  const isLovableApp = requestOrigin?.endsWith('.lovable.app') || requestOrigin?.endsWith('.lovable.dev') || requestOrigin?.endsWith('.lovableproject.com');
  const isSupabase = requestOrigin?.includes('supabase.co');
  const isLocalhost = requestOrigin?.includes('localhost');
  
  let origin = allowedOrigins[0]; // default fallback
  
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin) || isLovableApp || isSupabase || isLocalhost) {
      origin = requestOrigin;
    }
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // AUTHORIZATION: Verify caller is admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth verification error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Request from user:', user.id, user.email);

    // Check if caller has admin role
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin) {
      console.log('Access denied: User is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verification passed');

    // Parse and validate request body
    const requestBody = await req.json();
    
    // Validate inputs using Zod
    const validationResult = createUserSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      console.error('Validation error:', firstError);
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, nome, role } = validationResult.data;
    console.log('Creating user:', { email, nome, role });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      // Check if user has a profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', existingUser.id)
        .single();
      
      if (existingProfile) {
        console.log('User already exists with profile:', email);
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado no sistema' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // User exists in auth but not in profiles - delete and recreate
      console.log('Orphaned user found, deleting:', existingUser.id);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.error('Error deleting orphaned user:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Erro ao limpar usuário órfão' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Orphaned user deleted successfully');
    }

    // Create user using admin API (does not log in)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        nome
      }
    });

    if (authError) {
      console.error('Auth error creating user:', authError);
      const safeError = mapToSafeError(authError);
      return new Response(
        JSON.stringify({ error: safeError.message, code: safeError.code }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created in auth:', authData.user.id);

    // Update profile (created by trigger)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ nome })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile error:', profileError);
      // Don't fail if profile update fails, just log it
    }

    // Assign role
    const { error: assignRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role
      });

    if (assignRoleError) {
      console.error('Role assignment error:', assignRoleError);
      const safeError = mapToSafeError(assignRoleError);
      return new Response(
        JSON.stringify({ error: safeError.message, code: safeError.code }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', authData.user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const safeError = mapToSafeError(error);
    return new Response(
      JSON.stringify({ error: safeError.message, code: safeError.code }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
