-- DropForeignKey
ALTER TABLE `garbagelog` DROP FOREIGN KEY `GarbageLog_device_id_fkey`;

-- DropForeignKey
ALTER TABLE `personlog` DROP FOREIGN KEY `PersonLog_device_id_fkey`;

-- AlterTable
ALTER TABLE `garbagelog` ADD COLUMN `org_id` INTEGER NULL,
    ADD COLUMN `site_id` INTEGER NULL,
    MODIFY `device_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `personlog` ADD COLUMN `org_id` INTEGER NULL,
    ADD COLUMN `site_id` INTEGER NULL,
    MODIFY `device_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `GarbageLog` ADD CONSTRAINT `GarbageLog_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarbageLog` ADD CONSTRAINT `GarbageLog_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarbageLog` ADD CONSTRAINT `GarbageLog_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonLog` ADD CONSTRAINT `PersonLog_org_id_fkey` FOREIGN KEY (`org_id`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonLog` ADD CONSTRAINT `PersonLog_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonLog` ADD CONSTRAINT `PersonLog_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
