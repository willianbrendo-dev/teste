import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip, port, data } = await req.json();

    if (!ip || !port || !data) {
      return new Response(
        JSON.stringify({ error: 'IP, porta e dados são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Conectando à impressora em ${ip}:${port}`);

    // Convert base64 back to bytes
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Connect to printer via TCP with timeout
    const connectPromise = Deno.connect({
      hostname: ip,
      port: parseInt(port),
      transport: "tcp",
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    const conn = await Promise.race([connectPromise, timeoutPromise]) as Deno.TcpConn;

    console.log('Conexão estabelecida, enviando dados...');

    // Send ESC/POS data
    await conn.write(bytes);
    
    console.log('Dados enviados com sucesso');

    // Close connection
    conn.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Impressão enviada com sucesso',
        bytesSent: bytes.length 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na impressão de rede:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao conectar com a impressora',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
