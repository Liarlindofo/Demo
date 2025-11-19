# 🚀 Configuração da Plataforma Drin

## ✅ Status do Projeto
O projeto foi criado com sucesso e está funcionando! A tela inicial foi atualizada para ser mais minimalista conforme solicitado.

## 🎨 Nova Tela Inicial
- **Design minimalista** com shader sutil
- **Texto centralizado**: "Um novo universo para o seu negócio começa aqui"
- **Botão "Entrar"** abaixo do texto
- **Shader suave** usando as cores da paleta Drin (#000000, #001F05, #141415, #333333)

## 🛠️ Como Executar o Projeto

### 1. Navegue para o diretório do projeto
```bash
cd drin-platform
```

### 2. Execute o servidor de desenvolvimento
```bash
npm run dev
```

### 3. Acesse no navegador
Abra [http://localhost:3000](http://localhost:3000)

## 📧 Configuração do Email (Opcional)
Para testar o sistema de OTP por email:

1. **Crie uma conta no Resend:**
   - Acesse [resend.com](https://resend.com)
   - Crie uma conta gratuita

2. **Obtenha sua chave de API:**
   - Vá para API Keys no dashboard
   - Crie uma nova chave

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edite o arquivo `.env.local`:
   ```env
   RESEND_API_KEY=re_sua_chave_aqui
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## 🎯 Funcionalidades Disponíveis

### ✅ Tela Inicial (Landing)
- Design minimalista com shader sutil
- Texto principal centralizado
- Botão "Entrar" com navegação

### ✅ Sistema de Autenticação
- **Login**: `/auth/login`
- **Cadastro**: `/auth/register`
- **Verificação OTP**: `/auth/verify-otp`

### ✅ Validações Implementadas
- Validação de senha com todos os requisitos
- Validação de CNPJ com dígitos verificadores
- Formatação automática de CNPJ
- Sistema de notificações

### ✅ Integração com Resend
- Envio de OTP por email
- Templates personalizados
- Verificação de códigos

## 🎨 Paleta de Cores
- **Dark Green**: `#001F05`
- **Night**: `#141415`
- **Black**: `#000000`
- **White**: `#FFFFFF`

## 📱 Responsividade
O design é totalmente responsivo e funciona em:
- Desktop
- Tablet
- Mobile

## 🔧 Tecnologias Utilizadas
- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- ShadCN UI
- @paper-design/shaders-react
- Resend (para emails)
- React Hook Form + Zod

## 🚀 Próximos Passos
1. Teste a tela inicial
2. Navegue pelas páginas de autenticação
3. Configure o Resend para testar emails
4. Adicione novas funcionalidades conforme necessário

## 📞 Suporte
Se encontrar algum problema, verifique:
1. Se está no diretório correto (`drin-platform`)
2. Se todas as dependências foram instaladas (`npm install`)
3. Se o servidor está rodando (`npm run dev`)
4. Se a porta 3000 está disponível

O projeto está pronto para uso e desenvolvimento! 🎉













