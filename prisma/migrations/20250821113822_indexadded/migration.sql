-- CreateIndex
CREATE INDEX `GarbageLog_date_idx` ON `GarbageLog`(`date`);

-- CreateIndex
CREATE INDEX `PersonLog_date_idx` ON `PersonLog`(`date`);

-- RenameIndex
ALTER TABLE `garbagelog` RENAME INDEX `GarbageLog_device_id_fkey` TO `GarbageLog_device_id_idx`;

-- RenameIndex
ALTER TABLE `personlog` RENAME INDEX `PersonLog_device_id_fkey` TO `PersonLog_device_id_idx`;
