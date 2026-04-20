-- phpMyAdmin SQL Dump
-- version 5.1.1deb5ubuntu1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 24, 2026 at 04:26 PM
-- Server version: 8.0.43-0ubuntu0.22.04.2
-- PHP Version: 8.1.2-1ubuntu2.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `deals_platform`
--

-- --------------------------------------------------------

--
-- Table structure for table `ads`
--

CREATE TABLE `ads` (
  `id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `location` varchar(150) DEFAULT NULL,
  `banner` varchar(255) DEFAULT NULL,
  `owner_id` bigint UNSIGNED NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deals`
--

CREATE TABLE `deals` (
  `id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `store_id` bigint UNSIGNED NOT NULL,
  `original_price` decimal(12,2) NOT NULL,
  `discount_price` decimal(12,2) NOT NULL,
  `discount_rate` decimal(5,2) DEFAULT '0.00',
  `description` text,
  `deal_category_id` bigint UNSIGNED DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `status` enum('active','inactive','expired') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `deal_categories`
--

CREATE TABLE `deal_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `deal_categories`
--

INSERT INTO `deal_categories` (`id`, `category_name`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Flash Deals', 1, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(2, 'Weekend Offers', 2, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(3, 'Black Friday Specials', 3, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(4, 'Clearance', 4, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(5, 'Buy One Get One', 5, '2026-03-24 11:51:14', '2026-03-24 11:51:14');

-- --------------------------------------------------------

--
-- Table structure for table `deal_images`
--

CREATE TABLE `deal_images` (
  `id` bigint UNSIGNED NOT NULL,
  `deal_id` bigint UNSIGNED NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `status` enum('unread','read') NOT NULL DEFAULT 'unread',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stores`
--

CREATE TABLE `stores` (
  `id` bigint UNSIGNED NOT NULL,
  `vendor_id` bigint UNSIGNED NOT NULL,
  `store_name` varchar(150) NOT NULL,
  `description` text,
  `banner` varchar(255) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `address` text,
  `store_category_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `stores`
--

INSERT INTO `stores` (`id`, `vendor_id`, `store_name`, `description`, `banner`, `location`, `address`, `store_category_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'Alice Supermarket', 'Discounted products every week', NULL, 'Kigali', 'KG 10 Ave', 1, '2026-03-24 12:44:55', '2026-03-24 12:44:55');

-- --------------------------------------------------------

--
-- Table structure for table `store_categories`
--

CREATE TABLE `store_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `store_categories`
--

INSERT INTO `store_categories` (`id`, `category_name`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'Supermarket', 1, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(2, 'Electronics', 2, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(3, 'Fashion', 3, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(4, 'Furniture', 4, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(5, 'Sports', 5, '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(6, 'Home & Garden', 6, '2026-03-24 11:51:14', '2026-03-24 11:51:14');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` bigint UNSIGNED NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `duration_in_days` int NOT NULL,
  `max_ads` int NOT NULL DEFAULT '0',
  `max_deals` int NOT NULL DEFAULT '0',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `plan_name`, `description`, `price`, `duration_in_days`, `max_ads`, `max_deals`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Starter', 'Entry package for new vendors', '0.00', 30, 1, 10, 'active', '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(2, 'Growth', 'For stores promoting more deals and ads', '25.00', 30, 5, 50, 'active', '2026-03-24 11:51:14', '2026-03-24 11:51:14'),
(3, 'Premium', 'High visibility vendor package', '75.00', 30, 20, 250, 'active', '2026-03-24 11:51:14', '2026-03-24 11:51:14');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `address` text,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','vendor','public_user') NOT NULL DEFAULT 'public_user',
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
  `business_proof_document` varchar(255) DEFAULT NULL,
  `business_proof_uploaded_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `email`, `phone_number`, `address`, `password`, `role`, `email_verified`, `status`, `business_proof_document`, `business_proof_uploaded_at`, `created_at`, `updated_at`) VALUES
(1, 'Alice', 'Vendor', 'alice.vendor@example.com', '0780000000', 'Kigali', '$2a$10$QDrZIvDUMOfhKrCyf6JHdOecCoS7TLwgWqvuRaC7iyvM7u1wMwQPO', 'vendor', 0, 'active', NULL, NULL, '2026-03-24 11:57:44', '2026-03-24 11:57:44');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ads`
--
ALTER TABLE `ads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ads_owner` (`owner_id`);

--
-- Indexes for table `deals`
--
ALTER TABLE `deals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_deals_store` (`store_id`),
  ADD KEY `fk_deals_category` (`deal_category_id`);

--
-- Indexes for table `deal_categories`
--
ALTER TABLE `deal_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Indexes for table `deal_images`
--
ALTER TABLE `deal_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_deal_images_deal` (`deal_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notifications_user` (`user_id`);

--
-- Indexes for table `stores`
--
ALTER TABLE `stores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_stores_vendor` (`vendor_id`),
  ADD KEY `fk_stores_category` (`store_category_id`);

--
-- Indexes for table `store_categories`
--
ALTER TABLE `store_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `plan_name` (`plan_name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone_number` (`phone_number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ads`
--
ALTER TABLE `ads`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deals`
--
ALTER TABLE `deals`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deal_categories`
--
ALTER TABLE `deal_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `deal_images`
--
ALTER TABLE `deal_images`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stores`
--
ALTER TABLE `stores`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `store_categories`
--
ALTER TABLE `store_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ads`
--
ALTER TABLE `ads`
  ADD CONSTRAINT `fk_ads_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deals`
--
ALTER TABLE `deals`
  ADD CONSTRAINT `fk_deals_category` FOREIGN KEY (`deal_category_id`) REFERENCES `deal_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_deals_store` FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deal_images`
--
ALTER TABLE `deal_images`
  ADD CONSTRAINT `fk_deal_images_deal` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stores`
--
ALTER TABLE `stores`
  ADD CONSTRAINT `fk_stores_category` FOREIGN KEY (`store_category_id`) REFERENCES `store_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stores_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
