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
  documentType: z.enum(['service_order', 'checklist', 'receipt', 'custom', 'warranty']).optional(),
  metadata: z.object({
    description: z.string().optional(),
    checklistId: z.string().optional(),
  }).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requesterId: string | null = null;
  let requesterEmail: string | null = null;
  let requesterRole: string | null = null;

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
      console.error('[send-print-job] ❌ Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('[send-print-job] ❌ Auth verification error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    requesterId = user.id;
    requesterEmail = user.email || 'unknown';
    console.log('[send-print-job] ===== NOVA SOLICITAÇÃO DE IMPRESSÃO =====');
    console.log('[send-print-job] Solicitante:', requesterId, requesterEmail);
    console.log('[send-print-job] Timestamp:', new Date().toISOString());

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
      console.error('[send-print-job] ❌ Role check error:', adminRoleError || atendenteRoleError);
      return new Response(
        JSON.stringify({ error: 'Authorization check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    requesterRole = isAdmin ? 'admin' : (isAtendente ? 'atendente' : 'none');
    console.log('[send-print-job] Role do solicitante:', requesterRole);

    if (!isAdmin && !isAtendente) {
      console.log('[send-print-job] ❌ Access denied: User is not admin or atendente');
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
      console.error('[send-print-job] ❌ Validation error:', firstError);
      return new Response(
        JSON.stringify({ error: firstError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, osId, escposBase64, documentType, metadata } = validationResult.data;
    console.log('[send-print-job] O.S. ID:', osId);
    console.log('[send-print-job] Tipo de documento:', documentType || 'service_order');
    console.log('[send-print-job] Tamanho dos dados:', escposBase64.length, 'caracteres');

    // Check if there are any online PRINT_BRIDGE devices using presence
    console.log('[send-print-job] Criando canal de presença...');
    const presenceChannel = supabaseAdmin.channel('print_bridge_presence', {
      config: {
        presence: { key: 'server_' + crypto.randomUUID().slice(0, 8) },
      }
    });
    
    type DevicePresence = { deviceId?: string; role?: string; online?: boolean; timestamp?: number };
    let onlineDevices: Array<{ key: string; deviceId: string; role?: string; online: boolean; timestamp: number; ageMs: number }> = [];
    
    // Subscribe and wait for presence with improved sync handling
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[send-print-job] ⏱️ Timeout - prosseguindo com estado atual');
        resolve();
      }, 3000);

      let syncReceived = false;

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          console.log('[send-print-job] Presença sincronizada');
          syncReceived = true;
          
          // Verifica dispositivos após sync
          const presenceState = presenceChannel.presenceState();
          const now = Date.now();
          const MAX_STALENESS_MS = 120_000; // 2 minutos

          onlineDevices = Object.entries(presenceState as Record<string, DevicePresence[]>)
            .map(([key, devices]) => {
              const device = devices?.[0];
              console.log(`[send-print-job] Dispositivo "${key}":`, JSON.stringify(device));
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
              console.log(`[send-print-job] Avaliando ${d.deviceId}: online=${d.online}, role=${d.role}, age=${d.ageMs}ms => ${isValid ? 'válido' : 'inválido'}`);
              return isValid;
            })
            .sort((a, b) => b.timestamp - a.timestamp);

          console.log('[send-print-job] Dispositivos encontrados após sync:', onlineDevices.length);
          
          if (onlineDevices.length > 0) {
            clearTimeout(timeout);
            resolve();
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[send-print-job] 📥 Device joined:', key, JSON.stringify(newPresences));
          
          // Atualiza lista ao receber join
          const now = Date.now();
          const MAX_STALENESS_MS = 120_000;
          
          for (const presence of (newPresences as DevicePresence[])) {
            if (presence.role === 'print_bridge' && presence.online) {
              const existing = onlineDevices.find(d => d.deviceId === presence.deviceId);
              if (!existing) {
                onlineDevices.push({
                  key,
                  deviceId: presence.deviceId ?? key,
                  role: presence.role,
                  online: presence.online,
                  timestamp: presence.timestamp ?? now,
                  ageMs: presence.timestamp ? now - presence.timestamp : 0,
                });
                console.log('[send-print-job] ✅ Novo dispositivo adicionado:', presence.deviceId);
                
                if (syncReceived) {
                  clearTimeout(timeout);
                  resolve();
                }
              }
            }
          }
        })
        .subscribe((status) => {
          console.log('[send-print-job] Status do canal de presença:', status);
          if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('Erro ao conectar ao canal de presença'));
          }
        });
    });

    console.log('[send-print-job] Dispositivos Print Bridge online:', onlineDevices.length);

    let targetDeviceId: string | null = null;

    if (onlineDevices.length > 0) {
      // Seleciona o dispositivo mais recente (último heartbeat)
      const targetDevice = onlineDevices[0];
      targetDeviceId = targetDevice.deviceId;
      console.log('[send-print-job] ✅ Dispositivo selecionado:', targetDeviceId);
    } else {
      // Fallback: tenta encontrar o device_id de jobs pendentes anteriores
      console.log('[send-print-job] ⚠️ Nenhum dispositivo online, buscando device_id de jobs anteriores...');
      
      const { data: recentJobs } = await supabaseAdmin
        .from('print_jobs')
        .select('device_id')
        .not('device_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentJobs && recentJobs.length > 0 && recentJobs[0].device_id) {
        targetDeviceId = recentJobs[0].device_id;
        console.log('[send-print-job] 📋 Usando device_id de jobs anteriores:', targetDeviceId);
      } else {
        // Se não houver nenhum device_id conhecido, gera um placeholder
        targetDeviceId = 'pending_device';
        console.log('[send-print-job] 📋 Job será enfileirado para próximo dispositivo disponível');
      }
    }
    console.log('[send-print-job] ✅ Dispositivo selecionado:', targetDeviceId);

    // Check if device is already processing a job
    const { data: processingJobs, error: checkError } = await supabaseAdmin
      .from('print_jobs')
      .select('job_id')
      .eq('device_id', targetDeviceId)
      .eq('status', 'processing')
      .limit(1);

    if (checkError) {
      console.error('[send-print-job] Error checking processing jobs:', checkError);
    }

    const isDeviceBusy = processingJobs && processingJobs.length > 0;
    console.log('[send-print-job] Dispositivo ocupado:', isDeviceBusy);

    // Generate unique job ID
    const jobId = crypto.randomUUID();

    // Create job in database with complete metadata
    const { data: jobData, error: insertError } = await supabaseAdmin
      .from('print_jobs')
      .insert({
        job_id: jobId,
        os_id: osId,
        escpos_data_base64: escposBase64,
        device_id: targetDeviceId,
        status: 'pending',
        attempts: 0,
        max_attempts: 2
      })
      .select()
      .single();

    if (insertError) {
      console.error('[send-print-job] ❌ Error inserting print job:', insertError);
      await supabaseAdmin.removeChannel(presenceChannel);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar job de impressão: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-print-job] ✅ Print job criado:', jobId);

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
        documentType: documentType || 'service_order',
        metadata: {
          ...metadata,
          requesterId,
          requesterEmail,
          requesterRole,
          createdAt: new Date().toISOString()
        }
      }
    });

    console.log('[send-print-job] Broadcast result:', sendResult);

    // Cleanup channels
    await supabaseAdmin.removeChannel(presenceChannel);
    await supabaseAdmin.removeChannel(broadcastChannel);

    const processingTime = Date.now() - startTime;
    console.log('[send-print-job] ===== JOB ENVIADO COM SUCESSO =====');
    console.log('[send-print-job] Job ID:', jobId);
    console.log('[send-print-job] Device ID:', targetDeviceId);
    console.log('[send-print-job] Tempo de processamento:', processingTime, 'ms');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: isDeviceBusy 
          ? 'Impressão adicionada à fila. Dispositivo processando outro job.'
          : 'Impressão enviada para o dispositivo ponte',
        jobId,
        deviceId: targetDeviceId,
        queued: isDeviceBusy,
        processingTimeMs: processingTime
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-print-job] ❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
