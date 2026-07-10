CREATE TABLE `job_run_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(64) NOT NULL,
	`status` enum('success','error') NOT NULL,
	`message` text,
	`durationMs` int,
	`triggeredBy` varchar(32) NOT NULL DEFAULT 'cron',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_run_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobName` varchar(64) NOT NULL,
	`taskUid` varchar(128),
	`cronExpression` varchar(64),
	`description` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`lastRunStatus` enum('success','error','running'),
	`lastRunMessage` text,
	`runCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`)
);
