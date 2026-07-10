CREATE TABLE `routing_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int,
	`prompt` text NOT NULL,
	`selectedAgentId` varchar(64) NOT NULL,
	`selectedAgentName` varchar(128) NOT NULL,
	`score` float NOT NULL,
	`reason` text,
	`candidates` json,
	`overridden` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `routing_logs_id` PRIMARY KEY(`id`)
);
