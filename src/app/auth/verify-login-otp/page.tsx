"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { otpSchema, type OTPFormData } from "@/lib/validation";
import { useNotification } from "@/components/ui/notification";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";

export default function VerifyLoginOTPPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { showNotification, NotificationContainer } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  const onSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    try {
      // Obter tempKey da URL ou localStorage
      const tempKey = localStorage.getItem('loginTempKey');
      
      if (!tempKey) {
        showNotification("Sessão expirada. Faça o login novamente.", "error");
        return;
      }

      const response = await fetch('/api/verify-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempKey,
          otp: data.otp
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification(`Bem-vindo, ${result.user.fullName || result.user.username}!`, "success");
        
        // Limpar dados temporários
        localStorage.removeItem('loginTempKey');
        
        // Redirecionar para dashboard
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } else {
        showNotification(result.error || "Erro ao verificar código", "error");
      }
    } catch (error) {
      console.error('Erro na verificação:', error);
      showNotification("Erro interno. Tente novamente.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    setIsResending(true);
    try {
      // Obter dados do localStorage
      const tempKey = localStorage.getItem('loginTempKey');
      
      if (!tempKey) {
        showNotification("Sessão expirada. Faça o login novamente.", "error");
        return;
      }

      // Aqui você pode implementar uma API para reenviar OTP
      showNotification("Código reenviado para seu email", "success");
    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      showNotification("Erro ao reenviar código", "error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <NotificationContainer />
      
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-[#001F05] rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Verificar Login</CardTitle>
            <CardDescription className="text-gray-400">
              Digite o código de 6 dígitos enviado para seu email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-white">Código de Verificação</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] text-center text-2xl tracking-widest"
                  {...register("otp")}
                />
                {errors.otp && (
                  <p className="text-red-400 text-sm">{errors.otp.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#001F05] hover:bg-[#001F05]/80 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Verificando..." : "Verificar"}
              </Button>
            </form>

            {/* Resend OTP */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm mb-2">
                Não recebeu o código?
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={resendOTP}
                disabled={isResending}
                className="text-[#001F05] border-[#001F05] hover:bg-[#001F05] hover:text-white"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  "Reenviar Código"
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-[#374151] rounded-lg">
              <p className="text-gray-300 text-sm text-center">
                <strong>Dica:</strong> Verifique sua caixa de spam se não encontrar o email.
                O código expira em 10 minutos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}