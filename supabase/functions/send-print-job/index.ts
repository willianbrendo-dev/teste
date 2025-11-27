import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sendPrintJobSchema = z.object({
  userId: z.string().uuid('ID de usuário inválido'),
  osId: z.string().uuid('ID de ordem de serviço inválido'),
  escposBase64: z.string().min(1, 'Dados ESC/POS não podem estar vazios'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Check if caller is admin or atendente
    const { data: isAdmin, error: adminRoleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    const { data: isAtendente, error: atendenteRoleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'atendente'
    });

    if (adminRoleError || atendenteRoleError) {
      console.error('Role check error:', adminRoleError || atendenteRoleError);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdmin && !isAtendente) {
      console.log('Access denied: User is not admin or atendente');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin or atendente access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    
    const validationResult = sendPrintJobSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      console.error('Validation error:', firstError);
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, osId, escposBase64 } = validationResult.data;
    console.log('Sending print job for OS:', osId);

    // Check if there are any online PRINT_BRIDGE devices
    console.log('Criando canal de presença...');
    const presenceChannel = supabaseAdmin.channel('print_bridge_presence');
    
    // Subscribe and wait for sync
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao conectar ao canal de presença'));
      }, 5000);

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          console.log('Presença sincronizada');
          clearTimeout(timeout);
          resolve();
        })
        .subscribe((status) => {
          console.log('Status do canal de presença:', status);
          if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('Erro ao conectar ao canal de presença'));
          }
        });
    });

    // Aguarda um momento para garantir que o presenceState está populado
    await new Promise(resolve => setTimeout(resolve, 500));

    const presenceState = presenceChannel.presenceState();
    console.log('Estado de presença completo:', JSON.stringify(presenceState, null, 2));
    
    // Considera apenas dispositivos realmente online (heartbeat recente)
    const now = Date.now();
    const MAX_STALENESS_MS = 60_000; // 60 segundos

    type DevicePresence = { deviceId?: string; role?: string; online?: boolean; timestamp?: number };

    const onlineDevices = Object.entries(presenceState as Record<string, DevicePresence[]>)
      .map(([key, devices]) => {
        const device = devices?.[0];
        console.log(`Verificando key "${key}":`, devices);
        return {
          key,
          deviceId: device?.deviceId ?? key,
          role: device?.role,
          online: device?.online === true,
          timestamp: device?.timestamp ?? 0,
          ageMs: device?.timestamp ? now - device.timestamp : Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((d) => {
        const isValid = d.online && d.role === 'print_bridge' && d.ageMs <= MAX_STALENESS_MS;
        console.log(`Dispositivo avaliado:`, d, '=> válido?', isValid);
        return isValid;
      })
      // Ordena do mais recente para o mais antigo
      .sort((a, b) => b.timestamp - a.timestamp);

    console.log('Dispositivos Print Bridge realmente online:', onlineDevices.length);
    console.log('Detalhes dos dispositivos online:', onlineDevices);

    if (onlineDevices.length === 0) {
      await supabaseAdmin.removeChannel(presenceChannel);
      
      console.error('❌ Nenhum dispositivo Print Bridge encontrado online');
      console.error('Dica: Verifique se algum dispositivo está conectado na página /print-bridge');
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Nenhum dispositivo Print Bridge online no momento',
          hint: 'Certifique-se de que um dispositivo está conectado na página Print Bridge'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Seleciona o dispositivo mais recente (último heartbeat)
    const targetDevice = onlineDevices[0];
    const targetDeviceId = targetDevice.deviceId;
    console.log('Dispositivo selecionado:', targetDeviceId);

    // Check if device is already processing a job
    const { data: processingJobs, error: checkError } = await supabaseAdmin
      .from('print_jobs')
      .select('job_id')
      .eq('device_id', targetDeviceId)
      .eq('status', 'processing')
      .limit(1);

    if (checkError) {
      console.error('Error checking processing jobs:', checkError);
    }

    const isDeviceBusy = processingJobs && processingJobs.length > 0;

    // Generate unique job ID
    const jobId = crypto.randomUUID();

    // Create job in database
    const { data: jobData, error: insertError } = await supabaseAdmin
      .from('print_jobs')
      .insert({
        job_id: jobId,
        os_id: osId,
        escpos_data_base64: escposBase64,
        device_id: targetDeviceId,
        status: 'pending',
        attempts: 0,
        max_attempts: 3
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting print job:', insertError);
      await supabaseAdmin.removeChannel(presenceChannel);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar job de impressão: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Print job created:', jobId);

    // Send job via Realtime broadcast to the specific device
    const broadcastChannel = supabaseAdmin.channel('print_bridge_jobs');
    await broadcastChannel.subscribe();

    const sendResult = await broadcastChannel.send({
      type: 'broadcast',
      event: 'print_job',
      payload: {
        jobId,
        osId,
        escposDataBase64: escposBase64,
        deviceId: targetDeviceId,
        metadata: {
          createdAt: new Date().toISOString()
        }
      }
    });

    console.log('Broadcast result:', sendResult);

    // Cleanup channels
    await supabaseAdmin.removeChannel(presenceChannel);
    await supabaseAdmin.removeChannel(broadcastChannel);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isDeviceBusy 
          ? 'Impressão adicionada à fila. Dispositivo processando outro job.'
          : 'Impressão enviada para o dispositivo ponte',
        jobId,
        deviceId: targetDeviceId,
        queued: isDeviceBusy
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
