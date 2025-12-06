import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PrinterDevice {
  ip: string;
  port: number;
  name: string;
  status: 'online' | 'offline';
  responseTime?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subnet } = await req.json();
    
    // Se não fornecer subnet, usa ranges comuns
    const subnets = subnet 
      ? [subnet] 
      : ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    
    const commonPorts = [9100, 515, 631]; // RAW, LPD, IPP
    const printers: PrinterDevice[] = [];
    const timeout = 1000; // 1 segundo por tentativa
    
    console.log(`Buscando impressoras nas redes: ${subnets.join(', ')}`);
    
    // Para cada subnet, testa IPs comuns para impressoras (100-110, 200-210)
    for (const subnet of subnets) {
      const ipsToTest = [
        ...Array.from({ length: 11 }, (_, i) => `${subnet}.${100 + i}`),
        ...Array.from({ length: 11 }, (_, i) => `${subnet}.${200 + i}`),
      ];
      
      for (const ip of ipsToTest) {
        for (const port of commonPorts) {
          try {
            const startTime = Date.now();
            
            const connectPromise = Deno.connect({
              hostname: ip,
              port: port,
              transport: "tcp",
            });
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('timeout')), timeout);
            });
            
            const conn = await Promise.race([connectPromise, timeoutPromise]) as Deno.TcpConn;
            const responseTime = Date.now() - startTime;
            
            conn.close();
            
            // Encontrou uma impressora!
            const printerName = port === 9100 
              ? 'Impressora Térmica ESC/POS' 
              : port === 515 
              ? 'Impressora LPD' 
              : 'Impressora IPP';
            
            printers.push({
              ip,
              port,
              name: `${printerName} (${ip})`,
              status: 'online',
              responseTime,
            });
            
            console.log(`✓ Encontrada: ${ip}:${port} (${responseTime}ms)`);
            
            // Encontrou neste IP, não testa outras portas
            break;
          } catch (error) {
            // Não há impressora neste IP:porta
            continue;
          }
        }
        
        // Limita tempo total de busca
        if (printers.length >= 10) {
          break;
        }
      }
      
      if (printers.length >= 10) {
        break;
      }
    }
    
    console.log(`Busca finalizada. Encontradas ${printers.length} impressoras`);
    
    return new Response(
      JSON.stringify({ 
        printers,
        total: printers.length,
        message: printers.length === 0 
          ? 'Nenhuma impressora encontrada na rede. Verifique se a impressora está ligada e na mesma rede Wi-Fi.'
          : `${printers.length} impressora(s) encontrada(s)`,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na busca de impressoras:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao buscar impressoras na rede',
        details: error instanceof Error ? error.message : String(error),
        printers: [],
        total: 0,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
