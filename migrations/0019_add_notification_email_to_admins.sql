-- Migration 0019: Ajouter notification_email aux admins
-- Permet de configurer un email de notification distinct de l'email de connexion
-- Utilisé pour les rappels de tâches (l'email de connexion peut être fictif ex: setup@admin.cjd)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS notification_email text;
