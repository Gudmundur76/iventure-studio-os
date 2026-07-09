CREATE TABLE `worker_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` varchar(64) NOT NULL DEFAULT 'nanoclaw',
	`prompt` text NOT NULL,
	`language` varchar(8) NOT NULL DEFAULT 'is',
	`status` enum('queued','thinking','done','error') NOT NULL DEFAULT 'queued',
	`reply` text,
	`elapsedMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `worker_tasks_id` PRIMARY KEY(`id`)
);
