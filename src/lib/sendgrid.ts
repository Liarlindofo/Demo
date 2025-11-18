import sgMail from '@sendgrid/mail';

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailTemplate {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  // Método principal usando Resend (gratuito e confiável)
  static async sendOTP(email: string, otp: string, userName?: string): Promise<boolean> {
    try {
      // Usar Resend como método principal
      if (process.env.RESEND_API_KEY) {
        console.log(`📧 Enviando OTP para ${email} via Resend...`);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Drin Platform <noreply@drin.com>',
            to: email,
            subject: 'Código de Verificação - Drin Platform',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: #001F05; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">Drin Platform</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Verificação</p>
                </div>
                <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-bottom: 20px;">Código de Verificação</h2>
                  <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                    ${userName ? `Olá ${userName},` : 'Olá,'}
                  </p>
                  <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                    Use o código abaixo para verificar sua conta:
                  </p>
                  <div style="background: #001F05; color: white; padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px;">
                    <h1 style="margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
                  </div>
                  <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
                    Este código expira em <strong>10 minutos</strong>. Se você não solicitou este código, ignore este email.
                  </p>
                  <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 30px;">
                    <p style="color: #495057; font-size: 14px; margin: 0;">
                      <strong>Dica de Segurança:</strong> Nunca compartilhe este código com outras pessoas. 
                      A Drin Platform nunca solicitará seu código de verificação por telefone ou outros meios.
                    </p>
                  </div>
                </div>
                <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0;">© 2024 Drin Platform. Todos os direitos reservados.</p>
                  <p style="margin: 5px 0 0 0; opacity: 0.7;">Este é um email automático, não responda.</p>
                </div>
              </div>
            `,
          }),
        });

        if (response.ok) {
          console.log(`✅ OTP enviado com sucesso para ${email} via Resend`);
          return true;
        } else {
          const error = await response.text();
          console.error('❌ Erro ao enviar OTP via Resend:', error);
          return false;
        }
      }

      // Fallback para SendGrid se Resend não estiver configurado
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        console.log(`📧 Tentando enviar OTP para ${email} via SendGrid...`);
        
        const msg = {
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: 'Código de Verificação - Drin Platform',
          text: `Seu código de verificação é: ${otp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #001F05; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Drin Platform</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Código de Verificação</h2>
                <p style="color: #666; font-size: 16px;">
                  ${userName ? `Olá ${userName},` : 'Olá,'}
                </p>
                <p style="color: #666; font-size: 16px;">
                  Use o código abaixo para verificar sua conta:
                </p>
                <div style="background: #001F05; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                  <h1 style="margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Este código expira em 10 minutos. Se você não solicitou este código, ignore este email.
                </p>
              </div>
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">© 2024 Drin Platform. Todos os direitos reservados.</p>
              </div>
            </div>
          `,
        };

        await sgMail.send(msg);
        console.log(`✅ OTP enviado com sucesso para ${email} via SendGrid`);
        return true;
      }

      // Se nenhum serviço estiver configurado
      console.log(`📧 Nenhum serviço de email configurado`);
      console.log(`🔑 OTP para ${email}: ${otp}`);
      console.log(`⏰ Código expira em 10 minutos`);
      return false;
    } catch (error) {
      console.error('❌ Erro ao enviar OTP:', error);
      console.log(`🔑 OTP para ${email}: ${otp}`);
      console.log(`⏰ Código expira em 10 minutos`);
      return false;
    }
  }

  static async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    try {
      // Usar Resend como método principal
      if (process.env.RESEND_API_KEY) {
        console.log(`📧 Enviando email de boas-vindas para ${email} via Resend...`);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Drin Platform <noreply@drin.com>',
            to: email,
            subject: 'Bem-vindo à Drin Platform!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: #001F05; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">Drin Platform</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Bem-vindo!</p>
                </div>
                <div style="padding: 40px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-bottom: 20px;">Bem-vindo à Drin Platform!</h2>
                  <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                    Olá ${userName},
                  </p>
                  <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                    Sua conta foi criada com sucesso! Agora você pode acessar todas as funcionalidades da nossa plataforma.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://projetodrin.vercel.app'}/dashboard" 
                       style="background: #001F05; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                      Acessar Dashboard
                    </a>
                  </div>
                  <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 30px;">
                    <h3 style="color: #495057; margin-top: 0;">O que você pode fazer:</h3>
                    <ul style="color: #495057; padding-left: 20px;">
                      <li>Gerenciar suas lojas e produtos</li>
                      <li>Acessar relatórios detalhados</li>
                      <li>Configurar ferramentas WhatsApp</li>
                      <li>Agendar mensagens automáticas</li>
                    </ul>
                  </div>
                  <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Se você tiver alguma dúvida, entre em contato conosco através do dashboard.
                  </p>
                </div>
                <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0;">© 2024 Drin Platform. Todos os direitos reservados.</p>
                  <p style="margin: 5px 0 0 0; opacity: 0.7;">Este é um email automático, não responda.</p>
                </div>
              </div>
            `,
          }),
        });

        if (response.ok) {
          console.log(`✅ Email de boas-vindas enviado com sucesso para ${email} via Resend`);
          return true;
        } else {
          const error = await response.text();
          console.error('❌ Erro ao enviar email de boas-vindas via Resend:', error);
          return false;
        }
      }

      // Fallback para SendGrid
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        console.log(`📧 Enviando email de boas-vindas para ${email} via SendGrid...`);

        const msg = {
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: 'Bem-vindo à Drin Platform!',
          text: `Bem-vindo à Drin Platform, ${userName}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #001F05; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Drin Platform</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Bem-vindo à Drin Platform!</h2>
                <p style="color: #666; font-size: 16px;">
                  Olá ${userName},
                </p>
                <p style="color: #666; font-size: 16px;">
                  Sua conta foi criada com sucesso! Agora você pode acessar todas as funcionalidades da nossa plataforma.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://platefull.com.br'}/dashboard" 
                     style="background: #001F05; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Acessar Dashboard
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Se você tiver alguma dúvida, entre em contato conosco.
                </p>
              </div>
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">© 2024 Drin Platform. Todos os direitos reservados.</p>
              </div>
            </div>
          `,
        };

        await sgMail.send(msg);
        console.log(`✅ Email de boas-vindas enviado com sucesso para ${email} via SendGrid`);
        return true;
      }

      console.log(`📧 Nenhum serviço de email configurado - pulando email de boas-vindas para ${email}`);
      return false;
    } catch (error) {
      console.error('❌ Erro ao enviar email de boas-vindas:', error);
      return false;
    }
  }

}

export default EmailService;