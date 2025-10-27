# CONFIGURACAO DO STACK AUTH DASHBOARD

ERRO: REDIRECT_URL_NOT_WHITELISTED

Voce precisa configurar localhost:3000 no dashboard do Stack Auth.

PASSOS:

1. Acesse: https://app.stack-auth.com/projects/26dbad35-bdd4-497b-b94c-142f01758197/settings

2. Adicione os dominios permitidos:
   - http://localhost:3000
   - http://localhost:3001

3. Configure as URLs de redirect:
   - http://localhost:3000/handler/sign-in
   - http://localhost:3000/handler/sign-up
   - http://localhost:3000/handler/callback
   - http://localhost:3000/dashboard

4. Salve as configuracoes

5. Reinicie o servidor: npm run dev

6. Teste novamente

SEM ESSA CONFIGURACAO, NADA FUNCIONARA!
