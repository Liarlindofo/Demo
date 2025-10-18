"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/components/ui/notification";
import { ArrowLeft, Mail, RefreshCw, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function DebugOTPPage() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const { showNotification, NotificationContainer } = useNotification();

  useEffect(() => {
    // Buscar dados da URL ou localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const otpParam = urlParams.get('otp');
    
    if (emailParam) setEmail(emailParam);
    if (otpParam) setOtp(otpParam);
  }, []);

  const handleVerify = () => {
    if (!otp) {
      showNotification("Digite o código de verificação", "error");
      return;
    }

    // Simular verificação bem-sucedida
    showNotification("Código verificado com sucesso!", "success");
    
    // Redirecionar para dashboard após 2 segundos
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <NotificationContainer />
      
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Link href="/auth/register" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <Card className="bg-[#141415] border-[#374151]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-[#001F05] rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Código de Verificação</CardTitle>
            <CardDescription className="text-gray-400">
              Digite o código de 6 dígitos gerado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Email Display */}
            {email && (
              <div className="mb-4 p-3 bg-[#374151] rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong>Email:</strong> {email}
                </p>
              </div>
            )}

            {/* OTP Display */}
            {otp && (
              <div className="mb-6 p-4 bg-[#001F05] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white">Código Gerado:</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOTP(!showOTP)}
                    className="text-white hover:text-white/80"
                  >
                    {showOTP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-mono font-bold text-white tracking-widest">
                    {showOTP ? otp : '••••••'}
                  </div>
                </div>
              </div>
            )}

            {/* Manual OTP Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-white">Ou digite o código manualmente:</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="bg-[#374151] border-[#6b7280] text-white placeholder:text-gray-400 focus:border-[#001F05] text-center text-2xl tracking-widest"
                />
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerify}
                className="w-full bg-[#001F05] hover:bg-[#001F05]/80 text-white"
              >
                Verificar Código
              </Button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-[#374151] rounded-lg">
              <p className="text-gray-300 text-sm text-center">
                <strong>Dica:</strong> Se o email não chegou, o código foi mostrado no console do servidor.
                Este código expira em 10 minutos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
