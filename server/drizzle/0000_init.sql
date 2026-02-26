CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text,
  `telegram_id` text,
  `name` text NOT NULL,
  `password_hash` text NOT NULL,
  `is_admin` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_telegram_unique` ON `users` (`telegram_id`);

CREATE TABLE `student_profiles` (
  `user_id` text PRIMARY KEY NOT NULL,
  `grade` integer,
  `country` text NOT NULL DEFAULT 'Uzbekistan',
  `target_major` text,
  `sat_math` integer,
  `sat_reading_writing` integer,
  `sat_total` integer,
  `ielts_score` real,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `universities` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `state` text NOT NULL,
  `tuition_usd` integer,
  `aid_policy` text,
  `sat_range_min` integer,
  `sat_range_max` integer,
  `english_req` text,
  `application_deadline` text,
  `description` text
);
CREATE UNIQUE INDEX `universities_name_unique` ON `universities` (`name`);

CREATE TABLE `university_facts` (
  `id` text PRIMARY KEY NOT NULL,
  `university_id` text NOT NULL,
  `fact_text` text NOT NULL,
  `source_url` text NOT NULL,
  `tag` text,
  `year` integer,
  `created_at` integer NOT NULL,
  `is_verified` integer NOT NULL DEFAULT 0,
  FOREIGN KEY (`university_id`) REFERENCES `universities` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `sat_topics` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text
);

CREATE TABLE `sat_questions` (
  `id` text PRIMARY KEY NOT NULL,
  `topic_id` text NOT NULL,
  `question_text` text NOT NULL,
  `choices_json` text NOT NULL,
  `correct_choice` text NOT NULL,
  `explanation_text` text NOT NULL,
  FOREIGN KEY (`topic_id`) REFERENCES `sat_topics` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `sat_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `topic_id` text NOT NULL,
  `score` integer NOT NULL,
  `total` integer NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`topic_id`) REFERENCES `sat_topics` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);
