# ⚡ Quick Start - WhatsApp SaaS IA

Comandos rápidos para começar em **5 minutos**.

---

## 🚀 Na VPS (Backend)

```bash
# 1. Preparar (primeira vez)
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib chromium-browser
npm install -g pm2

# 2. Banco de dados
sudo -u postgres psql -c "CREATE DATABASE drin_whatsapp;"
sudo -u postgres psql -c "CREATE USER drin_user WITH PASSWORD 'SuaSenha123!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE drin_whatsapp TO drin_user;"

# 3. Enviar projeto (do seu PC)
# Na sua máquina:
cd drin-platform
scp -r backend/ root@SEU_IP:/root/drin-whatsapp-backend

# 4. Na VPS - Configurar
cd /root/drin-whatsapp-backend

# Criar .env
nano .env
# Cole:
DATABASE_URL="postgresql://drin_user:SuaSenha123!@localhost:5432/drin_whatsapp"
OPENROUTER_API_KEY="sk-or-v1-SUA_CHAVE"
DRIN_API_KEY="CRIE_UMA_CHAVE_ALEATORIA"
PORT=3001
NODE_ENV="production"
OPENROUTER_MODEL="openai/chatgpt-4o-latest"
# Salvar: Ctrl+O, Enter, Ctrl+X

# 5. Instalar e rodar
npm install
npx prisma generate
npx prisma db push
npm run build
mkdir -p logs src/sessions
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. Firewall
sudo ufw allow 3001
sudo ufw allow ssh
sudo ufw enable

# 7. Testar
curl http://localhost:3001/health

# 8. Criar cliente
curl -X POST http://localhost:3001/api/client \
  -H "Authorization: Bearer SUA_CHAVE_API" \
  -H "Content-Type: application/json" \
  -d '{"name":"Minha Empresa","botName":"Maria","storeType":"pizzaria","botEnabled":true}'

# ⚠️ COPIE O "id" RETORNADO!
```

---

## 🎨 Na Vercel (Frontend)

1. **Adicionar variáveis de ambiente:**
   ```
   NEXT_PUBLIC_BACKEND_URL=http://SEU_IP_VPS:3001
   NEXT_PUBLIC_DRIN_API_KEY=MESMA_CHAVE_DO_BACKEND
   ```

2. **Atualizar código:**
   
   `src/app/connections/page.tsx` - linha 13:
   ```typescript
   const CLIENT_ID = "cole_o_id_do_cliente_aqui";
   ```
   
   `src/app/whatsapp-tools/page.tsx` - linha 11:
   ```typescript
   const CLIENT_ID = "cole_o_id_do_cliente_aqui";
   ```

3. **Deploy:**
   ```bash
   git add .
   git commit -m "feat: adicionar sistema WhatsApp SaaS"
   git push
   ```

---

## 📱 Usar

1. Acesse `https://seu-site.vercel.app/connections`
2. Clique "Gerar QR Code" em um dos 3 WhatsApps
3. Escaneie com seu celular
4. Configure em `/whatsapp-tools`
5. Pronto! Envie mensagens para testar 🎉

---

## 🔧 Comandos Úteis

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs drin-whatsapp-backend

# Reiniciar
pm2 restart drin-whatsapp-backend

# Monitorar
pm2 monit
```

---

## 📚 Documentação Completa

- `WHATSAPP-SAAS-GUIDE.md` - Guia detalhado
- `backend/DEPLOY-VPS.md` - Deploy passo a passo
- `backend/README.md` - Docs backend
- `WHATSAPP-SAAS-STRUCTURE.md` - Estrutura completa

---

## 🆘 Ajuda Rápida

**QR não aparece?**
```bash
pm2 restart drin-whatsapp-backend
pm2 logs --lines 50
```

**Erro 401?**
- Verifique se `DRIN_API_KEY` é igual no backend e frontend

**Bot não responde?**
- Veja se está ativado em `/whatsapp-tools`
- Verifique créditos OpenRouter
- `pm2 logs`

---

**🎉 Sistema pronto em 5 minutos!**

