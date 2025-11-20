# 🚀 Deploy Rápido na VPS - Comandos Prontos

Use este guia para fazer deploy rápido. Copie e cole os comandos.

---

## PASSO 1: Preparar VPS (apenas primeira vez)

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar dependências Chrome
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget chromium-browser
```

---

## PASSO 2: Configurar Banco

```bash
# Acessar PostgreSQL
sudo -u postgres psql

# Copie e cole TUDO de uma vez:
CREATE DATABASE drin_whatsapp;
CREATE USER drin_user WITH PASSWORD 'MinhaS3nh4S3gur4!';
GRANT ALL PRIVILEGES ON DATABASE drin_whatsapp TO drin_user;
\q
```

---

## PASSO 3: Enviar Projeto

**Na sua máquina local:**
```bash
cd drin-platform
scp -r backend/ root@SEU_IP:/root/drin-whatsapp-backend
```

---

## PASSO 4: Configurar Backend

```bash
# Na VPS
cd /root/drin-whatsapp-backend

# Criar .env
cat > .env << 'EOF'
DATABASE_URL="postgresql://drin_user:MinhaS3nh4S3gur4!@localhost:5432/drin_whatsapp"
OPENROUTER_API_KEY="sk-or-v1-COLE_SUA_CHAVE_AQUI"
DRIN_API_KEY="CRIE_UMA_CHAVE_ALEATORIA_AQUI"
PORT=3001
NODE_ENV="production"
OPENROUTER_MODEL="openai/chatgpt-4o-latest"
EOF

# IMPORTANTE: Edite o arquivo para colocar suas chaves reais
nano .env
# Ctrl+O para salvar, Enter, Ctrl+X para sair
```

---

## PASSO 5: Instalar e Iniciar

```bash
# Instalar dependências
npm install

# Prisma
npx prisma generate
npx prisma db push

# Build
npm run build

# Criar pastas
mkdir -p logs src/sessions

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Firewall
sudo ufw allow 3001
sudo ufw allow ssh
sudo ufw enable
```

---

## PASSO 6: Testar

```bash
# Teste local
curl http://localhost:3001/health

# Se retornar JSON com "success":true, está funcionando! 🎉
```

---

## PASSO 7: Criar Primeiro Cliente

```bash
# Substitua SUA_CHAVE_API pela chave que você colocou no .env
curl -X POST http://localhost:3001/api/client \
  -H "Authorization: Bearer SUA_CHAVE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Empresa",
    "botName": "Maria",
    "storeType": "pizzaria",
    "botEnabled": true
  }'

# COPIE O "id" QUE RETORNAR - você vai precisar no frontend!
```

---

## PASSO 8: Configurar Frontend (Vercel)

Na Vercel, adicione estas variáveis de ambiente:

```
NEXT_PUBLIC_BACKEND_URL=http://SEU_IP_VPS:3001
NEXT_PUBLIC_DRIN_API_KEY=MESMA_CHAVE_DO_BACKEND
```

Depois, no código frontend, substitua:
- `src/app/connections/page.tsx` linha 13
- `src/app/whatsapp-tools/page.tsx` linha 11

Trocar `"your_client_id"` pelo ID retornado no passo 7.

---

## ✅ PRONTO!

Acesse seu frontend e comece a usar:
- `/connections` - Conectar WhatsApps
- `/whatsapp-tools` - Configurar bot

---

## 🔧 Comandos Úteis

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs drin-whatsapp-backend

# Reiniciar
pm2 restart drin-whatsapp-backend

# Parar
pm2 stop drin-whatsapp-backend
```

---

## 🐛 Problemas?

**QR Code não aparece?**
```bash
pm2 logs drin-whatsapp-backend --lines 50
pm2 restart drin-whatsapp-backend
```

**Erro 401?**
- Verifique se a chave no frontend é igual à do backend

**Bot não responde?**
- Verifique créditos no OpenRouter
- Veja os logs: `pm2 logs`

---

## 🔄 Atualizar Código

```bash
cd /root/drin-whatsapp-backend
# Cole os novos arquivos aqui
npm install
npm run build
pm2 restart drin-whatsapp-backend
```

---

**Dúvidas? Veja o arquivo `WHATSAPP-SAAS-GUIDE.md` para guia completo.**

