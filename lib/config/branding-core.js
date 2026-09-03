"use strict";
// Configuration centralisée du branding/thème de l'application
// Personnalisez ces valeurs pour adapter l'application à votre organisation
// Ce fichier contient la configuration pure sans imports d'assets, utilisable par Node.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInfoColor = exports.getErrorColor = exports.getWarningColor = exports.getSuccessColor = exports.getOrgName = exports.getShortAppName = exports.getAppName = exports.getBrandColor = exports.brandingCore = void 0;
exports.brandingCore = {
    // Informations de base
    organization: {
        name: "",
        fullName: "",
        tagline: "Application collaborative pour le partage d'idées et la gestion d'événements",
        url: "https://votre-domaine.com",
        email: "",
    },
    // Application
    app: {
        name: "",
        shortName: "",
        description: "",
        ideaBoxName: "Boîte à Kiffs", // Nom de la fonctionnalité de partage d'idées
    },
    // Couleurs du thème (format hexadécimal)
    colors: {
        // Couleurs de marque
        primary: "#00a844", // Couleur principale (vert CJD)
        primaryDark: "#008835", // Variante sombre
        primaryLight: "#00c94f", // Variante claire
        secondary: "#1a1a1a", // Couleur secondaire
        accent: "#2196f3", // Couleur d'accent (bleu)
        background: "#f9fafb", // Fond de l'application
        // États et feedback
        success: "#00c853", // Vert pour succès
        successDark: "#00a844", // Variante sombre
        successLight: "#e8f5e9", // Variante claire
        warning: "#ffa726", // Orange pour avertissements
        warningDark: "#f57c00", // Variante sombre
        warningLight: "#fff3e0", // Variante claire
        error: "#f44336", // Rouge pour erreurs
        errorDark: "#d32f2f", // Variante sombre
        errorLight: "#ffebee", // Variante claire
        info: "#2196f3", // Bleu pour informations
        infoDark: "#1976d2", // Variante sombre
        infoLight: "#e3f2fd", // Variante claire
        // Charts et visualisations
        chart1: "#00a844", // Couleur chart principale
        chart2: "#00bfa5", // Couleur chart secondaire
        chart3: "#ffa726", // Couleur chart tertiaire
        chart4: "#26c6da", // Couleur chart quaternaire
        chart5: "#ec407a", // Couleur chart quinaire
        // Couleurs utilitaires
        white: "#ffffff", // Blanc
        black: "#000000", // Noir
        chartBorder: "#cccccc", // Couleur de bordure pour les graphiques (gris clair)
        chartGrid: "#cccccc", // Couleur de grille pour les graphiques
    },
    // Typographie
    fonts: {
        primary: "Lato", // Police principale
        googleFontsUrl: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap",
        weights: [300, 400, 700, 900],
    },
    // Métadonnées PWA
    pwa: {
        themeColor: "#00a844",
        backgroundColor: "#f9fafb",
        display: "standalone",
        orientation: "portrait-primary",
        categories: ["business", "productivity", "social"],
        lang: "fr-FR",
    },
    // Réseaux sociaux / Open Graph
    social: {
        ogType: "website",
        twitterCard: "summary",
    },
    // Liens externes
    links: {
        website: "",
        support: "",
    },
};
// Helpers pour accéder à la configuration
const getBrandColor = (colorName) => exports.brandingCore.colors[colorName];
exports.getBrandColor = getBrandColor;
const getAppName = () => exports.brandingCore.app.name;
exports.getAppName = getAppName;
const getShortAppName = () => exports.brandingCore.app.shortName;
exports.getShortAppName = getShortAppName;
const getOrgName = () => exports.brandingCore.organization.name;
exports.getOrgName = getOrgName;
// Helpers pour les couleurs sémantiques
const getSuccessColor = () => exports.brandingCore.colors.success;
exports.getSuccessColor = getSuccessColor;
const getWarningColor = () => exports.brandingCore.colors.warning;
exports.getWarningColor = getWarningColor;
const getErrorColor = () => exports.brandingCore.colors.error;
exports.getErrorColor = getErrorColor;
const getInfoColor = () => exports.brandingCore.colors.info;
exports.getInfoColor = getInfoColor;
