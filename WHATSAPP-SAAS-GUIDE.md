# 🚀 Guia Completo - Sistema SaaS WhatsApp com IA

Este guia contém todas as informações necessárias para configurar e usar o sistema completo.

## 📁 Estrutura do Projeto

```
drin-platform/
├── backend/                         # Backend Node.js (VPS)
│   ├── src/
│   │   ├── api/                    # Controllers
│   │   │   ├── clients.controller.ts
│   │   │   ├── whatsapp.controller.ts
│   │   │   └── chatbot.controller.ts
│   │   ├── services/               # Lógica de negócio
│   │   │   ├── whatsapp.service.ts
│   │   │   ├── openrouter.service.ts
│   │   │   └── clientConfig.service.ts
│   │   ├── middlewares/            # Autenticação e erros
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── config/                 # Configurações
│   │   │   ├── env.ts
│   │   │   └── prisma.ts
│   │   ├── utils/                  # Utilitários
│   │   │   └── logger.ts
│   │   └── server.ts               # Servidor Express
│   ├── prisma/
│   │   └── schema.prisma           # Schema do banco
│   ├── package.json
│   ├── tsconfig.json
│   └── ecosystem.config.js         # Config PM2
│
└── src/app/                        # Frontend Next.js (Vercel)
    ├── connections/
    │   └── page.tsx                # Página de conexões
    └── whatsapp-tools/
        └── page.tsx                # Página de ferramentas

```

---

## 🔧 PARTE 1: SETUP DO BACKEND NA VPS

### 1.1 Conectar na VPS

```bash
ssh root@SEU_IP_VPS
```

### 1.2 Preparar Ambiente

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version

# Instalar PM2
npm install -g pm2

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Dependências do Chrome (para WPPConnect)
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
  libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
  libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
  libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
  libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
  fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### 1.3 Configurar Banco de Dados

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Executar (dentro do psql):
CREATE DATABASE drin_whatsapp;
CREATE USER drin_user WITH PASSWORD 'SuaSenhaSuperSegura123!';
GRANT ALL PRIVILEGES ON DATABASE drin_whatsapp TO drin_user;
\q
```

### 1.4 Enviar Projeto para VPS

**Opção A - Do seu computador via SCP:**
```bash
# Na sua máquina local
cd drin-platform
scp -r backend/ root@SEU_IP_VPS:/root/drin-whatsapp-backend
```

**Opção B - Via Git:**
```bash
# Na VPS
cd /root
git clone seu-repositorio.git drin-whatsapp-backend
```

### 1.5 Configurar Variáveis de Ambiente

```bash
cd /root/drin-whatsapp-backend
nano .env
```

Cole e preencha:
```env
DATABASE_URL="postgresql://drin_user:SuaSenhaSuperSegura123!@localhost:5432/drin_whatsapp"
OPENROUTER_API_KEY="sk-or-v1-seu-token-aqui"
DRIN_API_KEY="chave-api-super-secreta-aleatoria-123"
PORT=3001
NODE_ENV="production"
OPENROUTER_MODEL="openai/chatgpt-4o-latest"
```

**⚠️ IMPORTANTE:** 
- `DRIN_API_KEY`: Gere uma chave aleatória segura (será usada no frontend)
- `OPENROUTER_API_KEY`: Pegue em https://openrouter.ai/keys

Salvar: `Ctrl+O`, `Enter`, `Ctrl+X`

### 1.6 Instalar e Configurar

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Criar tabelas no banco
npx prisma db push

# Build do TypeScript
npm run build

# Criar diretórios
mkdir -p logs
mkdir -p src/sessions
```

### 1.7 Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar auto-start
pm2 startup

# Verificar status
pm2 status
pm2 logs drin-whatsapp-backend
```

### 1.8 Configurar Firewall

```bash
sudo ufw allow 3001
sudo ufw allow ssh
sudo ufw enable
```

### 1.9 Testar Backend

```bash
# Teste simples
curl http://localhost:3001/health

# Deve retornar:
# {"success":true,"message":"DRIN WhatsApp Backend is running","timestamp":"..."}
```

---

## 🎨 PARTE 2: SETUP DO FRONTEND (VERCEL)

### 2.1 Configurar Variáveis de Ambiente

No seu projeto DRIN na Vercel, adicione:

```env
NEXT_PUBLIC_BACKEND_URL=http://SEU_IP_VPS:3001
NEXT_PUBLIC_DRIN_API_KEY=chave-api-super-secreta-aleatoria-123
```

**⚠️ IMPORTANTE:** Use a mesma `DRIN_API_KEY` que configurou no backend!

### 2.2 Atualizar Client ID

Nas páginas do frontend, substituir:

**`src/app/connections/page.tsx`** - Linha 13:
```typescript
const CLIENT_ID = "seu_client_id_real"; // Trocar
```

**`src/app/whatsapp-tools/page.tsx`** - Linha 11:
```typescript
const CLIENT_ID = "seu_client_id_real"; // Trocar
```

### 2.3 Criar Cliente no Backend

Primeiro, crie um cliente usando a API:

```bash
curl -X POST http://SEU_IP_VPS:3001/api/client \
  -H "Authorization: Bearer chave-api-super-secreta-aleatoria-123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Empresa",
    "botName": "Maria",
    "storeType": "pizzaria",
    "botEnabled": true
  }'
```

Copie o `id` retornado e use nos arquivos acima.

### 2.4 Deploy na Vercel

```bash
cd drin-platform
git add .
git commit -m "feat: adicionar sistema WhatsApp SaaS"
git push
```

A Vercel fará o deploy automaticamente.

---

## 📱 PARTE 3: COMO USAR

### 3.1 Conectar WhatsApp

1. Acesse: `https://seu-site.vercel.app/connections`
2. Clique em **"Gerar QR Code"** em um dos 3 cards
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a confirmação da conexão

### 3.2 Configurar Bot

1. Acesse: `https://seu-site.vercel.app/whatsapp-tools`
2. Configure:
   - **Controle do Bot**: Ative/desative respostas automáticas
   - **Tempo de Contexto**: Quanto tempo o bot lembra da conversa
   - **Tipo de Loja**: Personaliza as respostas
   - **Nome do Bot**: Como ele se apresenta
   - **Prompt Base**: Instruções principais
   - **Regras**: O que ele NÃO pode falar
   - **Limite de Mensagens**: Quantas mensagens mantém no contexto
3. Clique em **"Salvar Configurações"**

### 3.3 Testar o Bot

Envie uma mensagem para o WhatsApp conectado. O bot deve responder automaticamente usando IA!

---

## 🔑 COMO FUNCIONA

### Fluxo de Mensagens

```
Cliente WhatsApp
    ↓
WPPConnect (Backend)
    ↓
OpenRouter GPT-4o
    ↓
Resposta gerada
    ↓
WPPConnect → Cliente
```

### Autenticação

Todas as requisições do frontend para o backend usam:
```
Authorization: Bearer DRIN_API_KEY
```

### Multi-Cliente (SaaS)

- Cada cliente tem um `clientId` único
- Cada cliente pode ter até 3 WhatsApps conectados (slots 1, 2, 3)
- Configurações são isoladas por cliente

---

## 🛠️ COMANDOS ÚTEIS

### Backend (VPS)

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs drin-whatsapp-backend

# Reiniciar
pm2 restart drin-whatsapp-backend

# Parar
pm2 stop drin-whatsapp-backend

# Ver uso de recursos
pm2 monit

# Atualizar código
cd /root/drin-whatsapp-backend
git pull  # ou envie via SCP
npm install
npm run build
pm2 restart drin-whatsapp-backend
```

### Banco de Dados

```bash
# Acessar
psql -U drin_user -d drin_whatsapp

# Ver clientes
SELECT * FROM "Client";

# Ver sessões
SELECT * FROM "Session";

# Sair
\q
```

---

## 🐛 TROUBLESHOOTING

### Problema: QR Code não aparece

**Solução:**
```bash
# Verificar logs
pm2 logs drin-whatsapp-backend --lines 100

# Reinstalar dependências do Chrome
sudo apt-get install -y chromium-browser

# Reiniciar backend
pm2 restart drin-whatsapp-backend
```

### Problema: Bot não responde

**Verificar:**
1. Bot está ativado? (WhatsApp Tools → Controle do Bot)
2. OpenRouter tem créditos?
3. Chave API está correta?

```bash
# Testar OpenRouter
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer sk-or-v1-seu-token"
```

### Problema: Erro 401 Unauthorized

- Verifique se `NEXT_PUBLIC_DRIN_API_KEY` no frontend é igual a `DRIN_API_KEY` no backend
- Confirme que a variável está definida na Vercel

### Problema: Conexão cai

```bash
# Ver status
pm2 logs

# Limpar sessões antigas
rm -rf /root/drin-whatsapp-backend/src/sessions/*

# Reiniciar
pm2 restart drin-whatsapp-backend
```

---

## 📊 MONITORAMENTO

### Logs do Sistema

```bash
# Backend logs
tail -f /root/drin-whatsapp-backend/logs/out.log
tail -f /root/drin-whatsapp-backend/logs/err.log

# PM2 logs
pm2 logs drin-whatsapp-backend --lines 50
```

### Uso de Recursos

```bash
pm2 monit
```

### Health Check

```bash
curl http://localhost:3001/health
```

---

## 🔒 SEGURANÇA

### 1. HTTPS (Recomendado)

Use Nginx como reverse proxy:

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Configurar domínio
sudo nano /etc/nginx/sites-available/drin-backend

# Adicionar:
server {
    listen 80;
    server_name api.seu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Ativar
sudo ln -s /etc/nginx/sites-available/drin-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL
sudo certbot --nginx -d api.seu-dominio.com
```

### 2. Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

### 3. Chaves Fortes

- Use geradores de senha para criar `DRIN_API_KEY`
- Nunca exponha as chaves no GitHub
- Rotacione chaves periodicamente

---

## 📈 ESCALABILIDADE

### Múltiplos Clientes

Para adicionar mais clientes:

```bash
curl -X POST http://SEU_IP_VPS:3001/api/client \
  -H "Authorization: Bearer SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cliente 2",
    "botName": "João"
  }'
```

Use o `id` retornado no frontend.

### Backup Automático

```bash
# Criar script de backup
nano /root/backup-db.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U drin_user drin_whatsapp > /root/backups/db_$DATE.sql

# Tornar executável
chmod +x /root/backup-db.sh

# Agendar (todo dia às 3h)
crontab -e
# Adicionar: 0 3 * * * /root/backup-db.sh
```

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Deploy do backend na VPS
2. ✅ Deploy do frontend na Vercel
3. ✅ Conectar primeiro WhatsApp
4. ✅ Configurar bot
5. ✅ Testar com mensagens reais
6. 📊 Monitorar logs e performance
7. 🔒 Configurar HTTPS
8. 📈 Adicionar mais clientes conforme necessário

---

## 📞 SUPORTE

**Logs importantes:**
- Backend: `pm2 logs drin-whatsapp-backend`
- Sessões: `/root/drin-whatsapp-backend/src/sessions/`
- Banco: `psql -U drin_user -d drin_whatsapp`

**Testar APIs:**
```bash
# Health
curl http://localhost:3001/health

# Sessions
curl -H "Authorization: Bearer SUA_CHAVE" \
  http://localhost:3001/api/whatsapp/CLIENT_ID/sessions

# Config
curl -H "Authorization: Bearer SUA_CHAVE" \
  http://localhost:3001/api/client/CLIENT_ID/config
```

---

## ✅ CHECKLIST FINAL

- [ ] Backend rodando na VPS (port 3001)
- [ ] PM2 configurado e salvando estado
- [ ] PostgreSQL com banco criado
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend atualizado com backend URL
- [ ] Frontend atualizado com Client ID correto
- [ ] Primeiro cliente criado no banco
- [ ] QR Code sendo gerado com sucesso
- [ ] WhatsApp conectado
- [ ] Bot respondendo mensagens
- [ ] Configurações salvando corretamente

---

**🎉 Sistema Completo e Funcional!**

Desenvolvido com ❤️ para DRIN Platform

