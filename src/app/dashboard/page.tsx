"use client";

import { StoreCarousel } from "@/components/store-carousel";
import { ReportsSection } from "@/components/reports-section";
import { WhatsAppButton } from "@/components/whatsapp-button";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Store Carousel */}
      <StoreCarousel />
      
      {/* Reports Section */}
      <ReportsSection />
      
      {/* WhatsApp Button */}
      <WhatsAppButton />
    </div>
  );
}






