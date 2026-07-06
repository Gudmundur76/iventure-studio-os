CREATE TABLE `updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(256) NOT NULL,
	`title` varchar(256) NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'fréttir',
	`published` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `updates_id` PRIMARY KEY(`id`),
	CONSTRAINT `updates_slug_unique` UNIQUE(`slug`)
);
