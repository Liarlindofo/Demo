import { z } from "zod";

// Schema de validação para cadastro
export const registerSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").max(18, "CNPJ inválido"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  password: z.string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(50, "Senha deve ter no máximo 50 caracteres")
    .refine((password) => {
      // Pelo menos 1 símbolo
      const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      // Pelo menos 4 números
      const hasNumbers = (password.match(/\d/g) || []).length >= 4;
      // Pelo menos 1 letra maiúscula
      const hasUpperCase = /[A-Z]/.test(password);
      
      return hasSymbol && hasNumbers && hasUpperCase;
    }, {
      message: "Senha deve conter pelo menos: 1 símbolo, 4 números e 1 letra maiúscula"
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema de validação para login
export const loginSchema = z.object({
  email: z.string().min(1, "Login é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Schema de validação para OTP
export const otpSchema = z.object({
  otp: z.string().length(6, "OTP deve ter 6 dígitos"),
});

// Função para validar CNPJ
export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (parseInt(cleanCNPJ[12]) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return parseInt(cleanCNPJ[13]) === digit2;
}

// Função para formatar CNPJ
export function formatCNPJ(cnpj: string): string {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;













