CREATE TABLE `measurement_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`measured_at` integer NOT NULL,
	`notes` text,
	`client_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `measurement_entries_user_id_idx` ON `measurement_entries` (`user_id`);--> statement-breakpoint
CREATE TABLE `measurement_types` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`precision` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `measurement_types_user_id_idx` ON `measurement_types` (`user_id`);--> statement-breakpoint
CREATE TABLE `measurement_values` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`type_id` text NOT NULL,
	`value` real NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `measurement_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `measurement_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `measurement_values_entry_id_idx` ON `measurement_values` (`entry_id`);--> statement-breakpoint
INSERT INTO `measurement_types` (`id`, `user_id`, `key`, `label`, `unit`, `precision`, `sort_order`) VALUES
('mt_weight', NULL, 'weight', 'Peso', 'kg', 1, 1),
('mt_arm', NULL, 'arm', 'Braccio', 'cm', 1, 2),
('mt_chest', NULL, 'chest', 'Torace', 'cm', 1, 3),
('mt_waist', NULL, 'waist', 'Vita', 'cm', 1, 4),
('mt_abdomen', NULL, 'abdomen', 'Addome', 'cm', 1, 5),
('mt_hips', NULL, 'hips', 'Fianchi', 'cm', 1, 6),
('mt_thigh_prox', NULL, 'thigh_prox', 'Coscia prossimale', 'cm', 1, 7),
('mt_thigh_mid', NULL, 'thigh_mid', 'Coscia media', 'cm', 1, 8),
('mt_calf', NULL, 'calf', 'Polpaccio', 'cm', 1, 9);