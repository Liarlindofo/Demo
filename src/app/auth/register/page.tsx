"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { registerSchema, type RegisterFormData, formatCNPJ, validateCNPJ } from "@/lib/validation";
import { useNotification } from "@/components/ui/notification";
import { Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification, NotificationContainer } = useNotification();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password", "");

  // Função para verificar requisitos da senha
  const getPasswordRequirements = () => {
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumbers = (password.match(/\d/g) || []).length >= 4;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasMinLength = password.length >= 6;

    return [
      { text: "Pelo menos 1 símbolo", valid: hasSymbol },
      { text: "Pelo menos 4 números", valid: hasNumbers },
      { text: "Pelo menos 1 letra maiúscula", valid: hasUpperCase },
      { text: "Mínimo de 6 caracteres", valid: hasMinLength },
    ];
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Validar CNPJ
      if (!validateCNPJ(data.cnpj)) {
        showNotification("CNPJ inválido", "error");
        setIsLoading(false);
        return;
      }

      // Chamar API de cadastro
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        showNotification(result.message, "success");
        
        // Salvar tempKey para verificação
        localStorage.setItem('tempKey', result.tempKey);
        
        // Redirecionar baseado no resultado do email
        setTimeout(() => {
          if (result.emailSent) {
            // Email funcionou, ir para página de verificação normal
            window.location.href = "/auth/verify-otp";
          } else if (result.debugUrl) {
            // Email falhou, ir para página de debug
            window.location.href = result.debugUrl;
          } else {
            // Fallback para página de verificação normal
            window.location.href = "/auth/verify-otp";
          }
        }, 2000);
      } else {
        showNotification(result.error || "Erro ao realizar cadastro", "error");
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      showNotification("Erro ao realizar cadastro. Tente novamente.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <NotificationContainer />
      
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Cadastrar</CardTitle>
            <CardDescription className="text-gray-400">
              Crie sua conta na plataforma Drin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-white">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-red-400 text-sm">{errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-400 text-sm">{errors.email.message}</p>
                )}
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-white">CNPJ</Label>
                <Input
                  id="cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05]"
                  {...register("cnpj", {
                    onChange: (e) => {
                      e.target.value = formatCNPJ(e.target.value);
                    }
                  })}
                />
                {errors.cnpj && (
                  <p className="text-red-400 text-sm">{errors.cnpj.message}</p>
                )}
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-white">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  className="bg-[#374151] border-[#6b7280] text-white focus:border-[#001F05]"
                  {...register("birthDate")}
                />
                {errors.birthDate && (
                  <p className="text-red-400 text-sm">{errors.birthDate.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {password && (
                  <div className="space-y-1 mt-2">
                    {getPasswordRequirements().map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.valid ? (
                          <Check className="h-3 w-3 text-green-400" />
                        ) : (
                          <X className="h-3 w-3 text-red-400" />
                        )}
                        <span className={req.valid ? "text-green-400" : "text-red-400"}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {errors.password && (
                  <p className="text-red-400 text-sm">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] pr-10"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#001F05] hover:bg-[#001F05]/80 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Já tem uma conta?{" "}
                <Link href="/auth/login" className="text-[#001F05] hover:underline">
                  Faça login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
