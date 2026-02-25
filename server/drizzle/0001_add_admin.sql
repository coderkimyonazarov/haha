-- Add is_admin column to existing users table
ALTER TABLE `users` ADD COLUMN `is_admin` integer NOT NULL DEFAULT 0;
