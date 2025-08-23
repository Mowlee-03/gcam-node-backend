-- DropForeignKey
ALTER TABLE `userdevice` DROP FOREIGN KEY `UserDevice_device_id_fkey`;

-- DropForeignKey
ALTER TABLE `userdevice` DROP FOREIGN KEY `UserDevice_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `userorganization` DROP FOREIGN KEY `UserOrganization_organization_id_fkey`;

-- DropForeignKey
ALTER TABLE `userorganization` DROP FOREIGN KEY `UserOrganization_user_id_fkey`;

-- DropIndex
DROP INDEX `UserDevice_device_id_fkey` ON `userdevice`;

-- DropIndex
DROP INDEX `UserOrganization_organization_id_fkey` ON `userorganization`;

-- AlterTable
ALTER TABLE `device` ADD COLUMN `location` JSON NULL;

-- AlterTable
ALTER TABLE `garbagelog` MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `personlog` MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE `UserOrganization` ADD CONSTRAINT `UserOrganization_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOrganization` ADD CONSTRAINT `UserOrganization_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDevice` ADD CONSTRAINT `UserDevice_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDevice` ADD CONSTRAINT `UserDevice_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
