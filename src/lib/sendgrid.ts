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
  static async sendOTP(email: string, otp: string, userName?: string): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY não configurada');
        return false;
      }

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@drin.com',
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
      console.log(`OTP enviado para ${email}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar OTP:', error);
      return false;
    }
  }

  static async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY não configurada');
        return false;
      }

      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@drin.com',
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
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
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
      console.log(`Email de boas-vindas enviado para ${email}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      return false;
    }
  }
}

export default EmailService;
