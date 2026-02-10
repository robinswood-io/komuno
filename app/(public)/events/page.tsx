'use client';

import EventsSection from "@/components/events-section";
import { useModuleGuard } from "@/hooks/use-module-guard";
import { Loader2 } from "lucide-react";

export default function EventsPage() {
  const { isEnabled, isLoading } = useModuleGuard('events');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="font-lato bg-gray-50 min-h-screen">
      <main>
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
          <EventsSection />
        </div>
      </main>
    </div>
  );
}
