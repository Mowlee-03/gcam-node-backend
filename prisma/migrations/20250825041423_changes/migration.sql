-- DropForeignKey
ALTER TABLE `device` DROP FOREIGN KEY `Device_organization_id_fkey`;

-- DropIndex
DROP INDEX `Device_organization_id_fkey` ON `device`;

-- AlterTable
ALTER TABLE `device` MODIFY `organization_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
