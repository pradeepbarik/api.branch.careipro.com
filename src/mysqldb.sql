CREATE TABLE `medicine_store` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `username` varchar(45) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `password` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `contact_no` varchar(13) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `logo` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `live_status` tinyint NOT NULL DEFAULT '0',
  `status` enum('not_verified','verified','approved','blocked','special') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT 'not_verified',
  `state` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `locality` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `location` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `location_lat` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `location_lng` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `banners` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci,
  `doctors` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci,
  `avg_rating` decimal(5,2) DEFAULT NULL,
  `rating_count` int DEFAULT NULL,
  `review_count` int DEFAULT NULL,
  `partner_type` enum('partnered','free_listing') COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `home_delivery` tinyint(1) DEFAULT NULL,
  `delivery_time_tag` text COLLATE utf8mb3_unicode_ci,
  `min_order_tag` text COLLATE utf8mb3_unicode_ci,
  `open_time` text COLLATE utf8mb3_unicode_ci,
  `partner_level` enum('onboarded','new','active','discontinued') COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  `market` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci

CREATE TABLE `medicine_store_detail` (
  `store_id` bigint NOT NULL,
  `owner_name` varchar(100) DEFAULT NULL,
  `owner_contact_no` varchar(15) DEFAULT NULL,
  UNIQUE KEY `store_id` (`store_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3

CREATE TABLE `store_products` (
  `store_id` int NOT NULL,
  `product_id` int NOT NULL,
  `price` decimal(13,2) DEFAULT '0.00',
  `selling_price` decimal(13,3) DEFAULT NULL,
  `status` enum('available','out_of_stock') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3

CREATE TABLE `store_category` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `image` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `enable` tinyint NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci
-- Short videos configured per city and per vertical page, the moving counterpart of site_banners.
-- The admin stores a link rather than a file: these are youtube shorts and similar, so careipro.com
-- derives the poster frame from the link unless a thumbnail is set here explicitly.
CREATE TABLE `site_short_videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `city` varchar(60) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `page` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `video_link` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `thumbnail` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '',
  `display_order` int NOT NULL DEFAULT '1',
  `active` tinyint NOT NULL DEFAULT '1',
  `expire_at` datetime DEFAULT NULL,
  `branch_id` int NOT NULL DEFAULT '0',
  `upload_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `city_page_active` (`city`,`page`,`active`,`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

-- Ambulance vehicles belonging to a clinic (a clinic registered with business_type='AMBULANCE').
-- One provider runs a fleet, so each row is a single vehicle with its own photo, crew and fares.
-- vehicle_type uses the same codes the careipro.com ambulance page lists: BLS, ALS, ICU, PTV,
-- NEONATAL, MORTUARY, AIR.
CREATE TABLE `clinic_ambulances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clinic_id` int NOT NULL,
  `branch_id` int NOT NULL DEFAULT '0',
  `vehicle_no` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `vehicle_type` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `title` varchar(120) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '',
  `photo` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '',
  `driver_name` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '',
  `driver_mobile` varchar(15) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '',
  `base_fare` decimal(10,2) NOT NULL DEFAULT '0.00',
  `per_km_charge` decimal(10,2) NOT NULL DEFAULT '0.00',
  `facilities` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '',
  -- json array of the routes this vehicle runs, [{from,to,distance_km,fare,note}]. Kept on the
  -- vehicle rather than in a child table because a route is only ever read with its vehicle.
  `service_routes` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `available_24x7` tinyint NOT NULL DEFAULT '0',
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `clinic_id_active` (`clinic_id`,`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;
