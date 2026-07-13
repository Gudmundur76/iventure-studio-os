CREATE TABLE `mr_agent_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`tenantRef` varchar(32),
	`persona` text NOT NULL,
	`doctrine` text NOT NULL,
	`workingStyle` text NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mr_agent_profiles_id` PRIMARY KEY(`id`)
);
