"use client";

import { StoreCarousel } from "@/components/store-carousel";
import { ReportsSection } from "@/components/reports-section";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { APIConnectionDialog } from "@/components/api-connection-dialog";

export default function DashboardPage() {
  return (
        <div className="min-h-screen bg-black">
          {/* Header com menu de APIs */}
          <header className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm border-b border-[#374151]/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#001F05] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Drin Platform</h1>
                <p className="text-xs text-gray-400">Dashboard de Vendas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <APIConnectionDialog />
            </div>
          </header>
          
          {/* Main Content */}
          <main>
            {/* Store Carousel */}
            <section className="py-6">
              <StoreCarousel />
            </section>
            
            {/* Reports Section */}
            <section className="py-6">
              <ReportsSection />
            </section>
          </main>
          
          {/* WhatsApp Button */}
          <WhatsAppButton />
        </div>
    );
  }

