-- Ajoute la connexion Google aux comptes existants.
-- A lancer une seule fois si DB_SYNCHRONIZE=false en production.

ALTER TABLE `users`
  ADD COLUMN `google_id` varchar(255) DEFAULT NULL AFTER `passwordHash`,
  ADD COLUMN `auth_provider` varchar(24) NOT NULL DEFAULT 'local' AFTER `google_id`,
  ADD UNIQUE KEY `IDX_users_google_id` (`google_id`);
