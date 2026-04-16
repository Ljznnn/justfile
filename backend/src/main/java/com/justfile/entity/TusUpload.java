package com.justfile.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Tus 上传会话实体类
 * <p>
 * 表示 Tus 协议的断点续传上传会话，跟踪上传进度
 * </p>
 */
@Data
@TableName("tus_upload")
public class TusUpload {

    /**
     * 会话 ID（主键，自增）
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * Tus 上传 ID
     * 用于客户端标识上传会话
     */
    private String tusId;

    /**
     * 关联的文件 ID
     */
    private Long fileId;

    /**
     * 所属分享 ID
     */
    private Long shareId;

    /**
     * 上传者指纹
     */
    private String uploaderFingerprint;

    /**
     * 文件总大小（字节）
     */
    private Long totalSize;

    /**
     * 已上传偏移量（字节）
     */
    private Long offset;

    /**
     * 上传元数据
     * Tus 协议的元数据，包含文件名等信息
     */
    private String metadata;

    /**
     * 会话过期时间
     */
    private LocalDateTime expiresAt;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
}