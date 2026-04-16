-- Database: justfile_share

-- Share table (stores share session information)
CREATE TABLE IF NOT EXISTS `share` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `share_code` VARCHAR(8) NOT NULL UNIQUE COMMENT 'Short share ID for users',
  `share_name` VARCHAR(100) DEFAULT NULL COMMENT 'Share display name, like group name',
  `password_hash` VARCHAR(255) DEFAULT NULL COMMENT 'BCrypt hashed password, NULL if no password',
  `creator_fingerprint` VARCHAR(64) NOT NULL COMMENT 'Browser fingerprint of creator',
  `share_mode` TINYINT DEFAULT 0 COMMENT '0: creator only upload, 1: all members can upload',
  `expires_at` DATETIME DEFAULT NULL COMMENT 'Expiration time, NULL means no expiration',
  `status` TINYINT DEFAULT 1 COMMENT '0: closed, 1: active, 2: expired',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_share_code` (`share_code`),
  INDEX `idx_creator` (`creator_fingerprint`),
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Share sessions';

-- Share member table (tracks participants)
CREATE TABLE IF NOT EXISTS `share_member` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `share_id` BIGINT NOT NULL,
  `member_fingerprint` VARCHAR(64) NOT NULL COMMENT 'Browser fingerprint',
  `member_name` VARCHAR(50) DEFAULT 'Anonymous' COMMENT 'Display name',
  `role` TINYINT DEFAULT 0 COMMENT '0: participant, 1: creator',
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_active_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_share_member` (`share_id`, `member_fingerprint`),
  INDEX `idx_member` (`member_fingerprint`),
  FOREIGN KEY (`share_id`) REFERENCES `share`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Share members';

-- File table (stores uploaded file metadata)
CREATE TABLE IF NOT EXISTS `file` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `share_id` BIGINT NOT NULL,
  `uploader_fingerprint` VARCHAR(64) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL COMMENT 'Storage path/filename',
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `file_size` BIGINT NOT NULL COMMENT 'File size in bytes',
  `storage_type` VARCHAR(20) NOT NULL COMMENT 'LOCAL, OSS, HDFS',
  `storage_path` VARCHAR(500) NOT NULL COMMENT 'Actual storage path',
  `upload_state` TINYINT DEFAULT 0 COMMENT '0: uploading, 1: completed, 2: failed',
  `tus_id` VARCHAR(64) DEFAULT NULL COMMENT 'tus upload ID for resumable uploads',
  `checksum` VARCHAR(64) DEFAULT NULL COMMENT 'File checksum (SHA-256)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_share` (`share_id`),
  INDEX `idx_uploader` (`uploader_fingerprint`),
  INDEX `idx_tus` (`tus_id`),
  FOREIGN KEY (`share_id`) REFERENCES `share`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Uploaded files';

-- Operation log table (audit trail)
CREATE TABLE IF NOT EXISTS `operation_log` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `share_id` BIGINT NOT NULL,
  `member_fingerprint` VARCHAR(64) NOT NULL,
  `operation_type` VARCHAR(30) NOT NULL COMMENT 'CREATE_SHARE, JOIN_SHARE, UPLOAD_FILE, DOWNLOAD_FILE, DELETE_FILE, CLOSE_SHARE',
  `resource_type` VARCHAR(20) DEFAULT NULL COMMENT 'SHARE, FILE',
  `resource_id` BIGINT DEFAULT NULL,
  `operation_detail` JSON DEFAULT NULL COMMENT 'Additional operation details',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_share` (`share_id`),
  INDEX `idx_member` (`member_fingerprint`),
  INDEX `idx_time` (`created_at`),
  FOREIGN KEY (`share_id`) REFERENCES `share`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Operation audit logs';

-- tus upload tracking
CREATE TABLE IF NOT EXISTS `tus_upload` (
  `id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `tus_id` VARCHAR(64) NOT NULL UNIQUE,
  `file_id` BIGINT DEFAULT NULL COMMENT 'Associated file record',
  `share_id` BIGINT NOT NULL,
  `uploader_fingerprint` VARCHAR(64) NOT NULL,
  `total_size` BIGINT NOT NULL,
  `offset` BIGINT DEFAULT 0,
  `metadata` VARCHAR(200) DEFAULT NULL COMMENT 'filename, filetype, etc.',
  `expires_at` DATETIME NOT NULL COMMENT 'Upload expiration',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tus_id` (`tus_id`),
  INDEX `idx_expires` (`expires_at`),
  FOREIGN KEY (`share_id`) REFERENCES `share`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='tus resumable upload tracking';