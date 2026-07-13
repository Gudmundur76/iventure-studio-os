ALTER TABLE `worker_tasks` ADD `parentTaskId` int;--> statement-breakpoint
ALTER TABLE `worker_tasks` ADD `metaRef` varchar(64);--> statement-breakpoint
ALTER TABLE `worker_tasks` ADD `subtaskIndex` int;