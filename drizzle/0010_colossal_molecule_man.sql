CREATE TABLE `sandbox_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`label` varchar(128) NOT NULL,
	`url` varchar(256) NOT NULL,
	`region` varchar(64) NOT NULL,
	`secret` varchar(256),
	`status` varchar(32) NOT NULL DEFAULT 'unknown',
	`lastHealthAt` bigint,
	`healthData` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sandbox_nodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `sandbox_nodes_nodeId_unique` UNIQUE(`nodeId`)
);
