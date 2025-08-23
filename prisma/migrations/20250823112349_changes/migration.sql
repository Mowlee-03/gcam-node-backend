-- DropForeignKey
ALTER TABLE `device` DROP FOREIGN KEY `Device_site_id_fkey`;

-- DropForeignKey
ALTER TABLE `site` DROP FOREIGN KEY `Site_organization_id_fkey`;

-- DropIndex
DROP INDEX `Device_site_id_fkey` ON `device`;

-- DropIndex
DROP INDEX `Site_organization_id_fkey` ON `site`;

-- AlterTable
ALTER TABLE `device` ADD COLUMN `name` VARCHAR(191) NULL,
    MODIFY `site_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Site` ADD CONSTRAINT `Site_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
