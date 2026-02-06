// Subscription handler functions and utilities
import { MemberSubscription } from './page';

export const calculateSubscriptionDates = (paymentDate: string, durationType: string) => {
  const startDate = new Date(paymentDate);
  const endDate = new Date(paymentDate);

  switch (durationType) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const getSubscriptionTypeLabel = (type: string): string => {
  switch (type) {
    case 'adherent':
      return 'Adhérent';
    case 'parrain':
      return 'Parrain';
    case 'bienfaiteur':
      return 'Bienfaiteur';
    case 'autre':
      return 'Autre';
    default:
      return type;
  }
};

export const getDurationTypeLabel = (type: string): string => {
  switch (type) {
    case 'monthly':
      return 'Mensuel';
    case 'quarterly':
      return 'Trimestriel';
    case 'yearly':
      return 'Annuel';
    default:
      return type;
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expired':
      return 'Expirée';
    case 'pending':
      return 'En attente';
    default:
      return status;
  }
};

export const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return '';
  }
};
