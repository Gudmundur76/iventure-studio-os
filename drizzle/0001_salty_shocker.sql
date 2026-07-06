CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`role` varchar(128) NOT NULL,
	`model` varchar(128) NOT NULL,
	`status` enum('active','idle','error','offline') NOT NULL DEFAULT 'idle',
	`grpoScore` float NOT NULL DEFAULT 0,
	`tasksCompleted` int NOT NULL DEFAULT 0,
	`lastRun` timestamp,
	`routingPriority` int NOT NULL DEFAULT 1,
	`capabilities` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_agentId_unique` UNIQUE(`agentId`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`model` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cortex_signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(128) NOT NULL,
	`skillsUsed` json,
	`grpoScore` float NOT NULL,
	`outcomeSignal` varchar(64) NOT NULL,
	`agentId` varchar(64),
	`nodeId` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cortex_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memory_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sprintId` varchar(32),
	`sessionType` varchar(64),
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`phase` varchar(32),
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memory_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectRef` varchar(32) NOT NULL,
	`clientName` varchar(128) NOT NULL,
	`clientEmail` varchar(320),
	`title` varchar(256) NOT NULL,
	`description` text,
	`serviceType` varchar(64),
	`status` enum('intake','scoping','active','review','delivered','archived') NOT NULL DEFAULT 'intake',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`budget` varchar(32),
	`deadline` timestamp,
	`assignedAgent` varchar(64),
	`deliverables` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectRef_unique` UNIQUE(`projectRef`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skillId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL,
	`description` text,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsed` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_skillId_unique` UNIQUE(`skillId`)
);
