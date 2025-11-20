"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, QrCode, Power, RefreshCw } from "lucide-react";

interface SessionStatus {
  slot: number;
  status: string;
  qrCode?: string;
  isActive: boolean;
}

const CLIENT_ID = "your_client_id"; // Substituir pelo clientId real
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_DRIN_API_KEY || "";

export default function ConnectionsPage() {
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ open: boolean; qrCode?: string; slot?: number }>({
    open: false,
  });
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000); // Atualizar a cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/${CLIENT_ID}/sessions`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (slot: number) => {
    setActionLoading({ ...actionLoading, [slot]: true });
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/${CLIENT_ID}/${slot}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.qrCode) {
          setQrModal({ open: true, qrCode: data.qrCode, slot });
        }
        await loadSessions();
      }
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
    } finally {
      setActionLoading({ ...actionLoading, [slot]: false });
    }
  };

  const stopSession = async (slot: number) => {
    setActionLoading({ ...actionLoading, [slot]: true });
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/${CLIENT_ID}/${slot}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      });

      if (response.ok) {
        await loadSessions();
      }
    } catch (error) {
      console.error("Erro ao desconectar sessão:", error);
    } finally {
      setActionLoading({ ...actionLoading, [slot]: false });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONNECTED":
      case "connected":
        return "bg-green-500";
      case "connecting":
      case "qrcode":
        return "bg-yellow-500";
      case "disconnected":
      case "error":
      default:
        return "bg-red-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "CONNECTED":
      case "connected":
        return "Conectado";
      case "connecting":
        return "Conectando...";
      case "qrcode":
        return "Aguardando QR Code";
      case "disconnected":
        return "Desconectado";
      case "error":
        return "Erro";
      default:
        return "Desconectado";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Conexões WhatsApp</h1>
          <p className="text-gray-400">Gerencie até 3 conexões simultâneas de WhatsApp</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card
              key={session.slot}
              className="bg-[#141415] border-[#374151] rounded-2xl p-6 hover:border-[#001F05] transition-all"
            >
              {/* Status Indicator */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(session.status)} ${
                    session.status === "connecting" ? "animate-pulse" : ""
                  }`}
                />
                <h3 className="text-xl font-semibold text-white">WhatsApp {session.slot}</h3>
              </div>

              {/* Status Text */}
              <p className="text-gray-400 mb-6">{getStatusText(session.status)}</p>

              {/* Actions */}
              <div className="space-y-3">
                {session.status === "CONNECTED" || session.status === "connected" ? (
                  <Button
                    onClick={() => stopSession(session.slot)}
                    disabled={actionLoading[session.slot]}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {actionLoading[session.slot] ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Power className="h-4 w-4 mr-2" />
                    )}
                    Desconectar
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => startSession(session.slot)}
                      disabled={actionLoading[session.slot]}
                      className="w-full bg-[#001F05] hover:bg-[#003308] text-white"
                    >
                      {actionLoading[session.slot] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      Gerar QR Code
                    </Button>

                    {session.status === "qrcode" && session.qrCode && (
                      <Button
                        onClick={() =>
                          setQrModal({ open: true, qrCode: session.qrCode, slot: session.slot })
                        }
                        variant="outline"
                        className="w-full border-[#374151] text-white hover:bg-[#374151]"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Ver QR Code
                      </Button>
                    )}
                  </>
                )}

                <Button
                  onClick={() => loadSessions()}
                  variant="outline"
                  className="w-full border-[#374151] text-white hover:bg-[#374151]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Status
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-[#141415] border-[#374151] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Como Conectar</h3>
          <ol className="space-y-2 text-gray-400">
            <li>1. Clique em "Gerar QR Code" no WhatsApp desejado</li>
            <li>2. Abra o WhatsApp no seu celular</li>
            <li>3. Vá em Mais opções {">"} Aparelhos conectados {">"} Conectar um aparelho</li>
            <li>4. Aponte a câmera para o QR Code exibido</li>
            <li>5. Aguarde a confirmação da conexão</li>
          </ol>
        </Card>
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrModal.open} onOpenChange={(open) => setQrModal({ open })}>
        <DialogContent className="bg-[#141415] border-[#374151] text-white">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code - WhatsApp {qrModal.slot}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6">
            {qrModal.qrCode ? (
              <>
                <img
                  src={qrModal.qrCode}
                  alt="QR Code"
                  className="w-64 h-64 bg-white p-4 rounded-lg"
                />
                <p className="text-gray-400 mt-4 text-center">
                  Aguardando leitura do QR Code...
                  <br />
                  <span className="text-xs">A conexão será confirmada automaticamente</span>
                </p>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>Gerando QR Code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
