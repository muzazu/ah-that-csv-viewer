CREATE TABLE `field_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`field_type` text DEFAULT 'text' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_field_definitions_key` ON `field_definitions` (`key`);--> statement-breakpoint
CREATE TABLE `gpon_ports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_id` integer,
	`port_identifier` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_gpon_ports_location` ON `gpon_ports` (`location_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_gpon_ports_location_port` ON `gpon_ports` (`location_id`,`port_identifier`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'OLT' NOT NULL,
	`address` text,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_locations_name` ON `locations` (`name`);--> statement-breakpoint
CREATE TABLE `odp_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location_id` integer,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_odp_points_name` ON `odp_points` (`name`);--> statement-breakpoint
CREATE INDEX `idx_odp_points_location` ON `odp_points` (`location_id`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pppoe_username` text NOT NULL,
	`gpon_port_id` integer,
	`odp_point_id` integer,
	`ip_address` text,
	`serial_number` text,
	`enabled` integer DEFAULT true NOT NULL,
	`extra_fields` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`gpon_port_id`) REFERENCES `gpon_ports`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`odp_point_id`) REFERENCES `odp_points`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_subscribers_pppoe` ON `subscribers` (`pppoe_username`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_subscribers_ip` ON `subscribers` (`ip_address`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_name` ON `subscribers` (`name`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_enabled` ON `subscribers` (`enabled`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_gpon_port` ON `subscribers` (`gpon_port_id`);--> statement-breakpoint
CREATE INDEX `idx_subscribers_odp_point` ON `subscribers` (`odp_point_id`);