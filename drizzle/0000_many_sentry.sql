CREATE TABLE `plan_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_name` text NOT NULL,
	`name_key` text NOT NULL,
	`readiness` integer NOT NULL,
	`training_days` integer NOT NULL,
	`goal` text NOT NULL,
	`split` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plan_history_name_created_idx` ON `plan_history` (`name_key`,`created_at`);