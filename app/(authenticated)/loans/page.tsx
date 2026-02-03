'use client';

import { MainLayout } from "@/components/layout";
import LoanItemsSection from "@/components/loan-items-section";

/**
 * Page Prêts - Utilisateurs authentifiés
 * Affiche les objets disponibles au prêt et permet de proposer du matériel
 */
export default function LoansPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <LoanItemsSection />
      </div>
    </MainLayout>
  );
}
