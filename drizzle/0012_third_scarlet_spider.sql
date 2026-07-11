CREATE TABLE `agent_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`emailAddress` varchar(320) NOT NULL,
	`gmailLabel` varchar(128),
	`direction` enum('inbound','outbound') NOT NULL,
	`subject` varchar(512),
	`snippet` text,
	`body` text,
	`fromAddress` varchar(320),
	`toAddress` varchar(320),
	`threadId` varchar(128),
	`messageId` varchar(128),
	`isRead` boolean NOT NULL DEFAULT false,
	`isReplied` boolean NOT NULL DEFAULT false,
	`agentReply` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_emails_messageId_unique` UNIQUE(`messageId`)
);
--> statement-breakpoint
CREATE TABLE `agent_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`cronExpression` varchar(64) NOT NULL,
	`taskPrompt` text NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`heartbeatTaskUid` varchar(128),
	`lastRunAt` timestamp,
	`lastRunStatus` enum('success','error','running'),
	`lastRunMessage` text,
	`runCount` int NOT NULL DEFAULT 0,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `browser_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(64) NOT NULL DEFAULT 'nanoclaw',
	`prompt` text NOT NULL,
	`startUrl` varchar(2048),
	`status` enum('queued','running','done','error') NOT NULL DEFAULT 'queued',
	`result` text,
	`screenshotUrl` varchar(2048),
	`steps` json,
	`elapsedMs` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `browser_tasks_id` PRIMARY KEY(`id`)
);
