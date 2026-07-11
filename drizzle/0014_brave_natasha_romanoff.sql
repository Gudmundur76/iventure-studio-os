CREATE TABLE `client_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientRef` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`status` enum('submitted','in_progress','done','cancelled') NOT NULL DEFAULT 'submitted',
	`agentReply` text,
	`agentTaskId` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `client_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientRef` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(128),
	`phone` varchar(32),
	`assignedAgentId` varchar(64) NOT NULL DEFAULT 'nanoclaw',
	`gmailLabel` varchar(128),
	`emailAddress` varchar(320),
	`portalToken` varchar(64) NOT NULL,
	`subdomain` varchar(64),
	`status` enum('active','onboarding','paused','churned') NOT NULL DEFAULT 'onboarding',
	`plan` varchar(32) NOT NULL DEFAULT 'starter',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_clientRef_unique` UNIQUE(`clientRef`),
	CONSTRAINT `clients_portalToken_unique` UNIQUE(`portalToken`)
);
