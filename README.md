# Drin - Plataforma de Relatórios

Uma plataforma web moderna para relatórios de ferramentas de restaurantes, inicialmente focada na integração com a Saipos.

## 🚀 Tecnologias Utilizadas

- **Next.js 15** - Framework React
- **React 18** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **ShadCN UI** - Componentes de interface
- **Resend** - API para envio de emails
- **Three.js** - Shaders animados
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de dados

## 🎨 Paleta de Cores

- **Dark Green**: `#001F05`
- **Night**: `#141415`
- **Black**: `#000000`
- **White**: `#FFFFFF`

## 📱 Funcionalidades Implementadas

### ✅ Tela Inicial (Landing)
- Shader animado com Three.js
- Design responsivo
- Tema escuro ativado por padrão
- Texto centralizado: "Um novo universo para o seu negócio começa aqui"
- Botão "Entrar" com navegação

### ✅ Sistema de Autenticação
- **Login**: Validação de email e senha
- **Cadastro**: Formulário completo com validações
- **Verificação OTP**: Sistema de código de 6 dígitos por email

### ✅ Validações de Senha
- Pelo menos 1 símbolo
- Pelo menos 4 números
- Pelo menos 1 letra maiúscula
- Mínimo de 6 caracteres
- Confirmação de senha

### ✅ Validação de CNPJ
- Validação completa com dígitos verificadores
- Formatação automática
- Feedback visual

### ✅ Sistema de Notificações
- Popup minimalista no canto inferior direito
- Cores: vermelho para erro, verde para sucesso
- Desaparece automaticamente
- Pode ser fechado clicando

### ✅ Integração com Resend
- Envio de OTP por email
- Templates personalizados
- Verificação de códigos
- Expiração em 10 minutos

## 🛠️ Configuração do Projeto

### 1. Instalação
```bash
npm install
```

### 2. Configuração das Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local` e configure:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local`:
```env
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Obter Chave da API Resend
1. Acesse [resend.com](https://resend.com)
2. Crie uma conta
3. Gere uma chave de API
4. Adicione a chave no arquivo `.env.local`

### 4. Executar o Projeto
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/
│   │   ├── send-otp/          # API para enviar OTP
│   │   └── verify-otp/        # API para verificar OTP
│   ├── auth/
│   │   ├── login/             # Página de login
│   │   ├── register/          # Página de cadastro
│   │   └── verify-otp/        # Página de verificação
│   ├── globals.css            # Estilos globais
│   ├── layout.tsx             # Layout principal
│   └── page.tsx               # Página inicial
├── components/
│   ├── ui/                    # Componentes ShadCN UI
│   │   ├── notification.tsx   # Sistema de notificações
│   │   └── ...
│   └── background-paper-shaders.tsx  # Shader animado
└── lib/
    ├── resend.ts              # Configuração do Resend
    └── validation.ts          # Schemas de validação
```

## 🔄 Fluxo de Autenticação

1. **Landing Page** → Usuário clica em "Entrar"
2. **Login/Register** → Usuário escolhe entre login ou cadastro
3. **Cadastro** → Preenche dados, valida CNPJ e senha
4. **Envio de OTP** → Sistema envia código por email
5. **Verificação** → Usuário digita código de 6 dígitos
6. **Sucesso** → Redirecionamento para dashboard (a implementar)

## 🎯 Próximas Implementações

- [ ] Dashboard principal
- [ ] Integração com API da Saipos
- [ ] Relatórios de vendas
- [ ] Integração com iFood
- [ ] Integração com Delivery Direto
- [ ] Sistema de usuários e permissões
- [ ] Exportação de relatórios
- [ ] Notificações push

## 📝 Notas de Desenvolvimento

- O projeto usa tema escuro por padrão
- Todas as validações são feitas no frontend e backend
- O sistema de OTP é temporário (em produção, use Redis)
- Os emails são enviados via Resend com templates personalizados
- O shader animado usa Three.js para efeitos visuais

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.
