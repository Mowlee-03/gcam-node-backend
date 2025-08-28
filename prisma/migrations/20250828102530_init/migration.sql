-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPERADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_mobile_key`(`mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserOrganization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `organization_id` INTEGER NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',

    UNIQUE INDEX `UserOrganization_user_id_organization_id_key`(`user_id`, `organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Site` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` JSON NOT NULL,
    `organization_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstalledDevice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `imei` VARCHAR(191) NOT NULL,
    `video_url` VARCHAR(191) NOT NULL,
    `is_installed` BOOLEAN NOT NULL DEFAULT true,
    `is_registered` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InstalledDevice_imei_key`(`imei`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `imei` VARCHAR(191) NOT NULL,
    `video_url` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `location` JSON NULL,
    `site_id` INTEGER NULL,
    `organization_id` INTEGER NULL,
    `max_count` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Device_imei_key`(`imei`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserDevice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `device_id` INTEGER NOT NULL,

    UNIQUE INDEX `UserDevice_user_id_device_id_key`(`user_id`, `device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarbageLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` INTEGER NOT NULL,
    `imei` VARCHAR(191) NOT NULL,
    `organization_name` VARCHAR(191) NOT NULL,
    `site_name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `box_count` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GarbageLog_device_id_idx`(`device_id`),
    INDEX `GarbageLog_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` INTEGER NOT NULL,
    `imei` VARCHAR(191) NOT NULL,
    `organization_name` VARCHAR(191) NOT NULL,
    `site_name` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PersonLog_device_id_idx`(`device_id`),
    INDEX `PersonLog_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LatestLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` INTEGER NOT NULL,
    `imei` VARCHAR(191) NOT NULL,
    `organization_name` VARCHAR(191) NOT NULL,
    `site_name` VARCHAR(191) NOT NULL,
    `garbage_image` VARCHAR(191) NOT NULL,
    `person_image` VARCHAR(191) NOT NULL,
    `update_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LatestLog_device_id_key`(`device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Missedlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` JSON NOT NULL,
    `problem` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserOrganization` ADD CONSTRAINT `UserOrganization_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOrganization` ADD CONSTRAINT `UserOrganization_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Site` ADD CONSTRAINT `Site_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDevice` ADD CONSTRAINT `UserDevice_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDevice` ADD CONSTRAINT `UserDevice_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarbageLog` ADD CONSTRAINT `GarbageLog_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonLog` ADD CONSTRAINT `PersonLog_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatestLog` ADD CONSTRAINT `LatestLog_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `Device`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
