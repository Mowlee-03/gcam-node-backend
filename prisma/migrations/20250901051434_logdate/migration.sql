/*
  Warnings:

  - Added the required column `garbage_date` to the `LatestLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `person_date` to the `LatestLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `latestlog` ADD COLUMN `garbage_date` DATETIME(3) NOT NULL,
    ADD COLUMN `person_date` DATETIME(3) NOT NULL;
