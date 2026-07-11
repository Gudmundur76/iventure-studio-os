CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantRef` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`plan` varchar(32) NOT NULL DEFAULT 'starter',
	`status` enum('active','suspended','trial') NOT NULL DEFAULT 'trial',
	`workerQuota` int NOT NULL DEFAULT 10,
	`defaultAgentId` varchar(64) NOT NULL DEFAULT 'nanoclaw',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_tenantRef_unique` UNIQUE(`tenantRef`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `tenantRef` varchar(32);