# 🤖 DRIN WhatsApp Backend - Sistema SaaS Multi-Cliente

Backend completo para gerenciamento de múltiplos WhatsApps com IA usando WPPConnect e OpenRouter.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- PM2 instalado globalmente (`npm install -g pm2`)
- Conta no OpenRouter (https://openrouter.ai/)

## 🚀 Instalação na VPS

### 1. Conectar na VPS

```bash
ssh root@seu-ip-da-vps
```

### 2. Instalar Node.js (se não tiver)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Instalar PM2

```bash
npm install -g pm2
```

### 4. Instalar PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 5. Configurar Banco de Dados

```bash
sudo -u postgres psql

# No prompt do PostgreSQL:
CREATE DATABASE drin_whatsapp;
CREATE USER drin_user WITH PASSWORD 'sua_senha_segura';
GRANT ALL PRIVILEGES ON DATABASE drin_whatsapp TO drin_user;
\q
```

### 6. Clonar/Enviar o Projeto

Opção A - Via Git:
```bash
git clone seu-repositorio.git
cd drin-whatsapp-backend
```

Opção B - Via SCP (do seu computador):
```bash
scp -r backend/ root@seu-ip:/root/drin-whatsapp-backend
```

### 7. Configurar Variáveis de Ambiente

```bash
cd /root/drin-whatsapp-backend
cp .env.example .env
nano .env
```

Preencher com suas credenciais:
```env
DATABASE_URL="postgresql://drin_user:sua_senha_segura@localhost:5432/drin_whatsapp"
OPENROUTER_API_KEY="sk-or-v1-xxxxxxxxxxxxx"
DRIN_API_KEY="sua_chave_api_segura_aleatoria"
PORT=3001
NODE_ENV="production"
OPENROUTER_MODEL="openai/chatgpt-4o-latest"
```

### 8. Instalar Dependências

```bash
npm install
```

### 9. Configurar Prisma

```bash
npx prisma generate
npx prisma db push
```

### 10. Build do Projeto

```bash
npm run build
```

### 11. Criar Diretórios Necessários

```bash
mkdir -p logs
mkdir -p src/sessions
```

### 12. Iniciar com PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 Comandos PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs drin-whatsapp-backend

# Reiniciar
pm2 restart drin-whatsapp-backend

# Parar
pm2 stop drin-whatsapp-backend

# Deletar
pm2 delete drin-whatsapp-backend
```

## 📡 APIs Disponíveis

### Health Check
```bash
GET /health
```

### Clientes

**Buscar Configuração**
```bash
GET /api/client/:clientId/config
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
```

**Criar Cliente**
```bash
POST /api/client
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
Body: {
  "name": "Cliente 1",
  "botName": "Maria",
  "storeType": "pizzaria"
}
```

**Atualizar Cliente**
```bash
PUT /api/client/:clientId/config
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
Body: {
  "botName": "Carlos",
  "basePrompt": "Você é um atendente...",
  "botEnabled": true
}
```

### WhatsApp

**Ver Todas as Sessões**
```bash
GET /api/whatsapp/:clientId/sessions
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
```

**Iniciar Sessão (Gerar QR Code)**
```bash
POST /api/whatsapp/:clientId/:slot/start
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
# slot: 1, 2 ou 3
```

**Status de uma Sessão**
```bash
GET /api/whatsapp/:clientId/:slot/status
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
```

**Desconectar Sessão**
```bash
DELETE /api/whatsapp/:clientId/:slot
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
```

**Enviar Mensagem Manual**
```bash
POST /api/whatsapp/:clientId/:slot/send
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
Body: {
  "to": "5511999999999@c.us",
  "message": "Olá!"
}
```

### Chatbot

**Testar Mensagem**
```bash
POST /api/chatbot/:clientId/test
Headers: Authorization: Bearer YOUR_DRIN_API_KEY
Body: {
  "message": "Olá, quero fazer um pedido"
}
```

## 🔒 Segurança

1. **Firewall**: Configure para permitir apenas as portas necessárias
```bash
sudo ufw allow 3001
sudo ufw enable
```

2. **HTTPS**: Use nginx como reverse proxy
```bash
sudo apt install nginx
# Configure nginx para proxy reverso com SSL
```

3. **Chaves API**: Nunca exponha suas chaves no código

## 🐛 Troubleshooting

### Erro: "Sessão não encontrada"
- Verifique se a sessão foi iniciada corretamente
- Reinicie o PM2: `pm2 restart drin-whatsapp-backend`

### Erro: "QR Code não aparece"
- Verifique os logs: `pm2 logs`
- Certifique-se que tem dependências do Chrome instaladas:
```bash
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### Erro no OpenRouter
- Verifique se tem créditos suficientes
- Confirme a chave API
- Teste: `curl -H "Authorization: Bearer sk-or-..." https://openrouter.ai/api/v1/models`

## 📊 Monitoramento

```bash
# Uso de recursos
pm2 monit

# Estatísticas
pm2 show drin-whatsapp-backend
```

## 🔄 Atualizações

```bash
cd /root/drin-whatsapp-backend
git pull  # ou envie novos arquivos
npm install
npm run build
pm2 restart drin-whatsapp-backend
```

## 📞 Suporte

- Logs: `/root/drin-whatsapp-backend/logs/`
- PM2 Logs: `pm2 logs drin-whatsapp-backend`
- Database: `psql -U drin_user -d drin_whatsapp`

---

Desenvolvido para DRIN Platform 🚀

