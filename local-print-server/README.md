# 🖨️ Servidor Local de Impressão Bematech

Servidor Node.js que permite impressão ESC/POS via USB para impressoras Bematech.

## 📋 Pré-requisitos

- **Node.js** versão 16 ou superior ([Download](https://nodejs.org))
- **Impressora Bematech** conectada via USB
- **Windows** 10/11 (ou adaptável para Linux/Mac)

## 🚀 Instalação

### 1. Instalar Node.js

Se ainda não tem Node.js instalado:

1. Baixe em [nodejs.org](https://nodejs.org)
2. Execute o instalador
3. Siga as instruções (deixe todas opções padrão marcadas)
4. Reinicie o computador

### 2. Instalar Dependências do Servidor

Abra o **Prompt de Comando** (CMD) ou **PowerShell** nesta pasta e execute:

```bash
npm install
```

Isso instalará:
- `express` - Framework web
- `cors` - Permite requisições do navegador
- `serialport` - Comunicação USB/Serial

## ▶️ Como Executar

### Modo Simples (Recomendado)

1. Conecte a impressora Bematech via USB
2. Dê duplo clique no arquivo **`start-server.bat`**
   - Se não existir, crie com o conteúdo: `npm start`
3. Uma janela de terminal abrirá mostrando:
   - Portas seriais disponíveis
   - Status da conexão
   - Servidor rodando em `http://localhost:9100`

### Modo Manual (via Terminal)

```bash
npm start
```

## 📡 Uso

### 1. Verificar Status

```bash
curl http://localhost:9100/status
```

Resposta:
```json
{
  "status": "online",
  "connected": true,
  "port": "COM3",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 2. Listar Portas Disponíveis

```bash
curl http://localhost:9100/ports
```

### 3. Conectar a uma Porta Específica

```bash
curl -X POST http://localhost:9100/connect -H "Content-Type: application/json" -d "{\"port\": \"COM3\"}"
```

### 4. Imprimir (base64)

```bash
curl -X POST http://localhost:9100/print -H "Content-Type: application/json" -d "{\"data\": \"DADOS_EM_BASE64\"}"
```

## 🔧 Integração com Sistema Web

No seu sistema Print Bridge, configure:

- **Método**: Bematech
- **Host**: `localhost`
- **Porta**: `9100`

O sistema enviará automaticamente os comandos ESC/POS para este servidor, que os encaminhará para a impressora USB.

## 🐛 Troubleshooting

### Porta Serial não Detectada

1. Verifique se a impressora está ligada e conectada
2. Verifique no **Gerenciador de Dispositivos** do Windows:
   - Procure por "Portas (COM & LPT)"
   - Anote o número da porta (ex: COM3)
3. Use o endpoint `/connect` manualmente com a porta correta

### Erro "Access Denied"

- Feche qualquer outro programa que esteja usando a impressora
- Feche o Bematech User Software se estiver aberto
- Reinicie o servidor

### Impressora não Imprime

1. Teste impressão direta pelo Windows
2. Verifique se o papel está carregado
3. Verifique se os LEDs da impressora indicam erro
4. Verifique os logs no terminal do servidor

## 📝 Formato dos Dados

O servidor aceita dois formatos:

### 1. JSON com Base64
```json
{
  "data": "G0BIZWxsbyBXb3JsZA=="
}
```

### 2. Binary (application/octet-stream)
Envie os bytes ESC/POS diretamente no body da requisição.

## 🔄 Auto-iniciar com Windows

Para executar automaticamente ao ligar o PC:

1. Pressione `Win + R`
2. Digite `shell:startup` e pressione Enter
3. Crie um atalho do arquivo `start-server.bat` nesta pasta
4. Mova o atalho para a pasta que abriu

## 📞 Endpoints da API

| Método | Endpoint      | Descrição                      |
|--------|---------------|--------------------------------|
| GET    | `/status`     | Status do servidor             |
| GET    | `/ports`      | Lista portas seriais           |
| POST   | `/connect`    | Conecta a uma porta            |
| POST   | `/print`      | Envia dados para impressão     |
| POST   | `/disconnect` | Desconecta da impressora       |

## 🛡️ Segurança

⚠️ **IMPORTANTE**: Este servidor só aceita conexões locais (localhost). Não exponha para a internet sem adicionar autenticação adequada.

## 📄 Licença

MIT
