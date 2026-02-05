'use client';

import { Wrench, Calendar, Users, ChartBar, Lightbulb } from "lucide-react";
import { MainLayout } from "@/components/layout";

export default function ToolsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
      {/* En-tête de la page */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-r from-primary to-success-dark rounded-full p-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Les outils du dirigeant
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
          Découvrez nos outils et ressources exclusives pour accompagner votre réussite entrepreneuriale
        </p>
      </div>

      {/* Section "Coming Soon" */}
      <div className="bg-gradient-to-r from-primary to-success-dark rounded-xl shadow-lg p-8 sm:p-12 text-white text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">🚀 Bientôt disponible</h2>
        <p className="text-success-light text-lg mb-6">
          Nous préparons une suite d'outils innovants pour vous accompagner dans votre développement professionnel et celui de votre entreprise.
        </p>
        <div className="inline-flex items-center bg-white/20 rounded-full px-6 py-3">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse mr-3"></div>
          <span className="font-medium">En cours de développement</span>
        </div>
      </div>

      {/* Aperçu des outils à venir */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
          <div className="bg-success-light rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-success-dark" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Planificateur stratégique</h3>
          <p className="text-gray-600">
            Organisez vos objectifs business et suivez votre progression avec des outils de planification avancés.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
          <div className="bg-info-light rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-info-dark" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Réseau & Mentoring</h3>
          <p className="text-gray-600">
            Connectez-vous avec d'autres dirigeants et accédez à des programmes de mentoring personnalisés.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
          <div className="bg-success-light rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <ChartBar className="w-6 h-6 text-success-dark" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Tableaux de bord</h3>
          <p className="text-gray-600">
            Analysez les performances de votre entreprise avec des indicateurs clés personnalisables.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
          <div className="bg-warning-light rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6 text-warning-dark" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Innovation Hub</h3>
          <p className="text-gray-600">
            Explorez les dernières tendances et innovations dans votre secteur d'activité.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300 md:col-span-2 lg:col-span-2">
          <div className="bg-gray-200 rounded-full w-12 h-12 flex items-center justify-center mb-4">
            <Wrench className="w-6 h-6 text-gray-700" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Boîte à outils complète</h3>
          <p className="text-gray-600">
            Accédez à une bibliothèque complète de ressources, modèles et guides pratiques pour développer votre activité et optimiser votre gestion d'entreprise.
          </p>
        </div>
      </div>

      {/* Appel à l'action */}
      <div className="mt-12 text-center">
        <div className="bg-gray-50 rounded-xl p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Vous avez des suggestions ?
          </h3>
          <p className="text-gray-600 mb-6">
            Nous aimerions connaître vos besoins pour développer les outils qui vous seront le plus utiles.
          </p>
          <button
            onClick={() => window.location.href = 'mailto:contact@cjd-amiens.fr?subject=Suggestions pour les outils du dirigeant'}
            className="bg-primary hover:bg-primary text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200"
            data-testid="button-contact-suggestions"
          >
            Nous faire part de vos idées
          </button>
        </div>
      </div>
      </div>
    </MainLayout>
  );
}
