/*
  Warnings:

  - Added the required column `box_count` to the `LatestLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `latestlog` ADD COLUMN `box_count` INTEGER NOT NULL;
