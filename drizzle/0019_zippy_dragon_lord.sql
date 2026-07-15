CREATE TABLE `public_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`model` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`visitorName` varchar(128),
	`visitorEmail` varchar(256),
	`source` varchar(64) NOT NULL DEFAULT 'iventure.studio',
	`status` enum('new','contacted','qualified','closed') NOT NULL DEFAULT 'new',
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `public_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_leads_sessionId_unique` UNIQUE(`sessionId`)
);
