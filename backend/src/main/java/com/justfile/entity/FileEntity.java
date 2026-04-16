package com.justfile.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 文件实体类
 * <p>
 * 表示分享会话中的文件，包含文件名、大小、存储位置等信息
 * </p>
 */
@Data
@TableName("file")
public class FileEntity {

    /**
     * 文件 ID（主键，自增）
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 所属分享 ID
     */
    private Long shareId;

    /**
     * 上传者指纹
     */
    private String uploaderFingerprint;

    /**
     * 原始文件名
     */
    private String originalName;

    /**
     * 存储文件名
     * 用于在存储系统中唯一标识文件
     */
    private String storedName;

    /**
     * 文件 MIME 类型
     */
    private String mimeType;

    /**
     * 文件大小（字节）
     */
    private Long fileSize;

    /**
     * 存储类型
     * LOCAL、OSS、HDFS
     */
    private String storageType;

    /**
     * 存储路径
     * 文件在存储系统中的路径
     */
    private String storagePath;

    /**
     * 上传状态
     * 0: 正在上传
     * 1: 已完成
     * 2: 上传失败
     */
    private Integer uploadState;

    /**
     * Tus 上传 ID
     * 用于断点续传
     */
    private String tusId;

    /**
     * 文件校验和
     * 用于验证文件完整性
     */
    private String checksum;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}