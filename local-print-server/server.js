/**
 * Servidor Local de Impressão Bematech
 * Escuta na porta 9100 e envia comandos ESC/POS para impressora USB
 */

const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');

const app = express();
const PORT = 9100;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// Estado da impressora
let printerPort = null;
let printerPath = null;
let isConnected = false;

/**
 * Detecta portas seriais disponíveis
 */
async function listSerialPorts() {
  try {
    const ports = await SerialPort.list();
    console.log('📍 Portas seriais disponíveis:');
    ports.forEach((port, index) => {
      console.log(`  ${index + 1}. ${port.path}`);
      if (port.manufacturer) {
        console.log(`     Fabricante: ${port.manufacturer}`);
      }
      if (port.vendorId && port.productId) {
        console.log(`     VID: ${port.vendorId}, PID: ${port.productId}`);
      }
    });
    return ports;
  } catch (error) {
    console.error('❌ Erro ao listar portas:', error.message);
    return [];
  }
}

/**
 * Conecta à impressora USB
 */
async function connectPrinter(path) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`🔌 Tentando conectar em: ${path}`);
      
      printerPort = new SerialPort({
        path: path,
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      printerPort.on('open', () => {
        printerPath = path;
        isConnected = true;
        console.log(`✅ Conectado à impressora em ${path}`);
        resolve(true);
      });

      printerPort.on('error', (err) => {
        console.error('❌ Erro na porta serial:', err.message);
        isConnected = false;
        reject(err);
      });

      printerPort.on('close', () => {
        console.log('⚠️  Porta serial fechada');
        isConnected = false;
      });

    } catch (error) {
      console.error('❌ Erro ao abrir porta:', error.message);
      reject(error);
    }
  });
}

/**
 * Envia dados para a impressora
 */
async function sendToPrinter(data) {
  return new Promise((resolve, reject) => {
    if (!isConnected || !printerPort) {
      reject(new Error('Impressora não conectada'));
      return;
    }

    printerPort.write(data, (error) => {
      if (error) {
        console.error('❌ Erro ao enviar:', error.message);
        reject(error);
      } else {
        console.log(`✅ Enviados ${data.length} bytes`);
        resolve(true);
      }
    });
  });
}

// ===== ROTAS DA API =====

/**
 * GET /status - Status do servidor
 */
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    connected: isConnected,
    port: printerPath,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ports - Lista portas disponíveis
 */
app.get('/ports', async (req, res) => {
  try {
    const ports = await listSerialPorts();
    res.json({
      success: true,
      ports: ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        vendorId: p.vendorId,
        productId: p.productId
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /connect - Conecta a uma porta serial
 */
app.post('/connect', async (req, res) => {
  const { port } = req.body;
  
  if (!port) {
    return res.status(400).json({
      success: false,
      error: 'Porta não especificada'
    });
  }

  try {
    // Fecha conexão anterior se existir
    if (printerPort && isConnected) {
      printerPort.close();
    }

    await connectPrinter(port);
    
    res.json({
      success: true,
      message: `Conectado a ${port}`,
      port: port
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /print - Envia dados para impressão
 */
app.post('/print', async (req, res) => {
  try {
    console.log('📥 Requisição de impressão recebida');
    
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Impressora não conectada. Use POST /connect primeiro.'
      });
    }

    let data;

    // Aceita tanto JSON quanto dados binários brutos
    if (req.is('application/json')) {
      const { data: base64Data } = req.body;
      
      if (!base64Data) {
        return res.status(400).json({
          success: false,
          error: 'Campo "data" (base64) não encontrado no body'
        });
      }

      // Decodifica base64 para Buffer
      data = Buffer.from(base64Data, 'base64');
      console.log(`📄 Dados decodificados: ${data.length} bytes`);
    } else if (req.is('application/octet-stream')) {
      data = req.body;
      console.log(`📄 Dados binários recebidos: ${data.length} bytes`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Content-Type deve ser application/json ou application/octet-stream'
      });
    }

    // Envia para impressora
    await sendToPrinter(data);

    res.json({
      success: true,
      message: 'Impressão enviada com sucesso',
      bytesSent: data.length
    });

  } catch (error) {
    console.error('❌ Erro na impressão:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /disconnect - Desconecta da impressora
 */
app.post('/disconnect', (req, res) => {
  if (printerPort && isConnected) {
    printerPort.close();
    res.json({
      success: true,
      message: 'Desconectado'
    });
  } else {
    res.json({
      success: false,
      message: 'Já desconectado'
    });
  }
});

// ===== INICIALIZAÇÃO =====

async function start() {
  console.log('🖨️  SERVIDOR DE IMPRESSÃO BEMATECH');
  console.log('===================================');
  console.log('');

  // Lista portas disponíveis
  const ports = await listSerialPorts();
  console.log('');

  // Tenta conectar automaticamente à primeira porta encontrada
  if (ports.length > 0) {
    try {
      // Prioriza portas com "USB" no nome ou com vendorId
      const usbPort = ports.find(p => 
        p.path.includes('USB') || 
        p.path.includes('ACM') ||
        p.vendorId
      );
      
      const targetPort = usbPort || ports[0];
      console.log(`🎯 Tentando conectar automaticamente: ${targetPort.path}`);
      await connectPrinter(targetPort.path);
    } catch (error) {
      console.log('⚠️  Não foi possível conectar automaticamente');
      console.log('   Use POST /connect com a porta desejada');
    }
  } else {
    console.log('⚠️  Nenhuma porta serial detectada');
    console.log('   Conecte a impressora USB e reinicie o servidor');
  }

  console.log('');
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Endpoints disponíveis:');
  console.log(`   GET  /status       - Status do servidor`);
  console.log(`   GET  /ports        - Lista portas disponíveis`);
  console.log(`   POST /connect      - Conecta a uma porta`);
  console.log(`   POST /print        - Envia impressão`);
  console.log(`   POST /disconnect   - Desconecta`);
  console.log('');
  console.log('⌨️  Pressione Ctrl+C para parar');
  console.log('');
}

// Inicia o servidor
app.listen(PORT, () => {
  start();
});

// Cleanup ao encerrar
process.on('SIGINT', () => {
  console.log('\n\n🛑 Encerrando servidor...');
  if (printerPort && isConnected) {
    printerPort.close();
  }
  process.exit(0);
});
