CREATE TABLE `code_edges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repoId` int NOT NULL,
	`fromNodeId` int NOT NULL,
	`toNodeId` int NOT NULL,
	`edgeType` enum('imports','calls','extends','implements','uses','exports') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `code_edges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `code_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`repoId` int NOT NULL,
	`nodeType` enum('file','function','class','module','variable','type') NOT NULL,
	`name` varchar(256) NOT NULL,
	`filePath` varchar(512) NOT NULL,
	`startLine` int,
	`endLine` int,
	`complexity` int NOT NULL DEFAULT 0,
	`linesOfCode` int NOT NULL DEFAULT 0,
	`churnScore` int NOT NULL DEFAULT 0,
	`isDeadCode` boolean NOT NULL DEFAULT false,
	`hasErrors` boolean NOT NULL DEFAULT false,
	`anomalyType` varchar(64),
	`anomalyDetail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `code_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `code_repos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`source` enum('local','ssh','github') NOT NULL DEFAULT 'local',
	`path` varchar(512) NOT NULL,
	`language` varchar(32) NOT NULL DEFAULT 'typescript',
	`lastScannedAt` timestamp,
	`nodeCount` int NOT NULL DEFAULT 0,
	`edgeCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `code_repos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `healing_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggerType` enum('task_error','anomaly','self_directed') NOT NULL,
	`triggerRef` varchar(128),
	`repoId` int,
	`nodeId` int,
	`issueTitle` varchar(256) NOT NULL,
	`issueDetail` text NOT NULL,
	`patchDiff` text,
	`patchSummary` text,
	`affectedFiles` json,
	`status` enum('pending','approved','dismissed','applied','failed') NOT NULL DEFAULT 'pending',
	`notificationSent` boolean NOT NULL DEFAULT false,
	`notificationId` varchar(128),
	`resolvedAt` timestamp,
	`resolvedBy` varchar(64),
	`appliedPrUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `healing_proposals_id` PRIMARY KEY(`id`)
);
