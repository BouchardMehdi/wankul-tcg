-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3308
-- Généré le : dim. 19 avr. 2026 à 19:18
-- Version du serveur : 8.0.31
-- Version de PHP : 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `wankul`
--

-- --------------------------------------------------------

--
-- Structure de la table `booster_openings`
--

DROP TABLE IF EXISTS `booster_openings`;
CREATE TABLE IF NOT EXISTS `booster_openings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `cardIds` json NOT NULL,
  `boosterCount` int NOT NULL DEFAULT '1',
  `userId` int DEFAULT NULL,
  `seasonNumber` int DEFAULT NULL,
  `seasonLabel` varchar(50) DEFAULT NULL,
  `resultJson` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_0419fc831824d90c9582f69c19d` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=152 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `bug_reports`
--

DROP TABLE IF EXISTS `bug_reports`;
CREATE TABLE IF NOT EXISTS `bug_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `usernameSnapshot` varchar(40) NOT NULL,
  `emailSnapshot` varchar(255) NOT NULL,
  `category` varchar(24) NOT NULL,
  `page` varchar(60) NOT NULL,
  `feature` varchar(80) NOT NULL,
  `priority` varchar(24) NOT NULL,
  `description` text NOT NULL,
  `reproductionSteps` text,
  `currentUrl` varchar(500) DEFAULT NULL,
  `browserInfo` varchar(1000) DEFAULT NULL,
  `screenshotUrl` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `resolutionNote` text,
  `treatedAt` datetime DEFAULT NULL,
  `fixedAt` datetime DEFAULT NULL,
  `closedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `treatedBy` varchar(80) DEFAULT NULL,
  `fixedBy` varchar(80) DEFAULT NULL,
  `closedBy` varchar(80) DEFAULT NULL,
  `lastStatusChangedBy` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_c3608c66301f63f9b03c208f00b` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


--
-- Structure de la table `bug_report_status_history`
--

DROP TABLE IF EXISTS `bug_report_status_history`;
CREATE TABLE IF NOT EXISTS `bug_report_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reportId` int NOT NULL,
  `fromStatus` varchar(20) DEFAULT NULL,
  `toStatus` varchar(20) NOT NULL,
  `note` text,
  `changedBy` varchar(80) NOT NULL DEFAULT 'system',
  `changedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_e1c0aba466fbc20faf44ae5aea9` (`reportId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- --------------------------------------------------------

--
-- Structure de la table `cards`
--

DROP TABLE IF EXISTS `cards`;
CREATE TABLE IF NOT EXISTS `cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `season` varchar(255) DEFAULT NULL,
  `seasonNumber` int DEFAULT NULL,
  `extension` varchar(50) DEFAULT NULL,
  `number` int DEFAULT NULL,
  `displayNumber` varchar(32) DEFAULT NULL,
  `rarity` varchar(255) NOT NULL,
  `type` varchar(80) DEFAULT NULL,
  `gameplayType` varchar(80) DEFAULT NULL,
  `specialEdition` tinyint NOT NULL DEFAULT '0',
  `artist` varchar(100) DEFAULT NULL,
  `imageUrl` varchar(255) NOT NULL,
  `specialCategory` varchar(80) DEFAULT NULL,
  `affiliatedSeason` varchar(50) DEFAULT NULL,
  `affiliatedSeasonNumber` int DEFAULT NULL,
  `sourceRarity` varchar(80) DEFAULT NULL,
  `sourceRaritySlug` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_c1ccc84e1cc9cf1981f0d21c70` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=750 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `display_openings`
--

DROP TABLE IF EXISTS `display_openings`;
CREATE TABLE IF NOT EXISTS `display_openings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `boosterCount` int NOT NULL DEFAULT '24',
  `resultJson` json NOT NULL,
  `userId` int DEFAULT NULL,
  `seasonNumber` int DEFAULT NULL,
  `season` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_db7a7f9dca50b0f1778f62148cb` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `economy_daily_stats`
--

DROP TABLE IF EXISTS `economy_daily_stats`;
CREATE TABLE IF NOT EXISTS `economy_daily_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `boostersOpened` int NOT NULL DEFAULT '0',
  `displaysOpened` int NOT NULL DEFAULT '0',
  `creditsSpent` int NOT NULL DEFAULT '0',
  `creditsEarnedOpening` int NOT NULL DEFAULT '0',
  `creditsEarnedQuickSell` int NOT NULL DEFAULT '0',
  `creditsEarnedJackpot` int NOT NULL DEFAULT '0',
  `marketVolume` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_6bf4602bb1834d4299bb5a37f6` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `market_listings`
--

DROP TABLE IF EXISTS `market_listings`;
CREATE TABLE IF NOT EXISTS `market_listings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quantity` int NOT NULL,
  `remaining_quantity` int NOT NULL,
  `price_credits` int NOT NULL,
  `market_price_snapshot` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `seller_id` int DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `listing_mode` varchar(20) NOT NULL DEFAULT 'UNIT',
  `offer_type` varchar(30) NOT NULL DEFAULT 'CREDITS_ONLY',
  `wanted_card_quantity` int NOT NULL DEFAULT '0',
  `wanted_card_market_price_snapshot` int NOT NULL DEFAULT '0',
  `wanted_card_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_367f0b58972665e723cff41097` (`status`),
  KEY `FK_dbb447132252fc2ff9758fd1dae` (`seller_id`),
  KEY `FK_99d075b0be723844643d3e6ccc7` (`card_id`),
  KEY `FK_ab43e179e4323d793fe8e21532a` (`wanted_card_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `market_price_history`
--

DROP TABLE IF EXISTS `market_price_history`;
CREATE TABLE IF NOT EXISTS `market_price_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `card_id` int NOT NULL,
  `price` int NOT NULL,
  `source_label` varchar(40) NOT NULL DEFAULT 'market_snapshot',
  `recorded_at` datetime NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_market_price_history_card_recorded_at` (`card_id`,`recorded_at`)
) ENGINE=InnoDB AUTO_INCREMENT=304 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `market_transactions`
--

DROP TABLE IF EXISTS `market_transactions`;
CREATE TABLE IF NOT EXISTS `market_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quantity` int NOT NULL,
  `unit_price_credits` int NOT NULL,
  `total_price_credits` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `listing_id` int DEFAULT NULL,
  `seller_id` int DEFAULT NULL,
  `buyer_id` int DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `listing_mode` varchar(20) NOT NULL DEFAULT 'UNIT',
  `offer_type` varchar(30) NOT NULL DEFAULT 'CREDITS_ONLY',
  `buyer_offered_card_quantity` int NOT NULL DEFAULT '0',
  `buyer_offered_card_id` int DEFAULT NULL,
  `transaction_type` varchar(30) NOT NULL DEFAULT 'CREDITS_SALE',
  `seller_reward_claimed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_e94279687a71604c95c3cdc98b7` (`listing_id`),
  KEY `FK_6ba0783ee56e40413af9705b38d` (`seller_id`),
  KEY `FK_6a43c86309cafdd20a6b58fa5a1` (`buyer_id`),
  KEY `FK_6e163e78461f54b14dc0a0f1bd5` (`card_id`),
  KEY `FK_2bd79087427af4ba8cb296c0f53` (`buyer_offered_card_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(40) NOT NULL,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `emailVerified` tinyint NOT NULL DEFAULT '0',
  `emailVerificationCodeHash` varchar(64) DEFAULT NULL,
  `emailVerificationExpiresAt` datetime DEFAULT NULL,
  `passwordResetCodeHash` varchar(64) DEFAULT NULL,
  `passwordResetExpiresAt` datetime DEFAULT NULL,
  `role` varchar(16) NOT NULL DEFAULT 'player',
  `adminPasswordHash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_fe0bb3f6520ee0469504521e71` (`username`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `user_cards`
--

DROP TABLE IF EXISTS `user_cards`;
CREATE TABLE IF NOT EXISTS `user_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quantity` int NOT NULL DEFAULT '0',
  `user_id` int DEFAULT NULL,
  `card_id` int DEFAULT NULL,
  `quantity_locked` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_1cfc0bbc8625d90b136c6f947c` (`user_id`,`card_id`),
  KEY `FK_a228f872c29059934696c9d4b61` (`card_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11462 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `user_economy`
--

DROP TABLE IF EXISTS `user_economy`;
CREATE TABLE IF NOT EXISTS `user_economy` (
  `user_id` int NOT NULL,
  `credits` int NOT NULL DEFAULT '0',
  `signup_bonus_granted` tinyint NOT NULL DEFAULT '0',
  `free_booster_charges` tinyint NOT NULL DEFAULT '4',
  `free_display_charges` tinyint NOT NULL DEFAULT '1',
  `booster_recharge_at` datetime DEFAULT NULL,
  `display_recharge_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `booster_openings`
--
ALTER TABLE `booster_openings`
  ADD CONSTRAINT `FK_0419fc831824d90c9582f69c19d` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `bug_reports`
--
ALTER TABLE `bug_reports`
  ADD CONSTRAINT `FK_c3608c66301f63f9b03c208f00b` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `bug_report_status_history`
--
ALTER TABLE `bug_report_status_history`
  ADD CONSTRAINT `FK_e1c0aba466fbc20faf44ae5aea9` FOREIGN KEY (`reportId`) REFERENCES `bug_reports` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `display_openings`
--
ALTER TABLE `display_openings`
  ADD CONSTRAINT `FK_db7a7f9dca50b0f1778f62148cb` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `market_listings`
--
ALTER TABLE `market_listings`
  ADD CONSTRAINT `FK_99d075b0be723844643d3e6ccc7` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_ab43e179e4323d793fe8e21532a` FOREIGN KEY (`wanted_card_id`) REFERENCES `cards` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `FK_dbb447132252fc2ff9758fd1dae` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `market_price_history`
--
ALTER TABLE `market_price_history`
  ADD CONSTRAINT `FK_b5a540d850413f51df6e3ec3e7f` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `market_transactions`
--
ALTER TABLE `market_transactions`
  ADD CONSTRAINT `FK_2bd79087427af4ba8cb296c0f53` FOREIGN KEY (`buyer_offered_card_id`) REFERENCES `cards` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `FK_6a43c86309cafdd20a6b58fa5a1` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_6ba0783ee56e40413af9705b38d` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_6e163e78461f54b14dc0a0f1bd5` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_e94279687a71604c95c3cdc98b7` FOREIGN KEY (`listing_id`) REFERENCES `market_listings` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_cards`
--
ALTER TABLE `user_cards`
  ADD CONSTRAINT `FK_a228f872c29059934696c9d4b61` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_fd1dbad94a6a2ccfc149c819076` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `user_economy`
--
ALTER TABLE `user_economy`
  ADD CONSTRAINT `FK_f2775c0da662f6568d774c3d796` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
