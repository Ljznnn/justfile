package com.justfile.dto.response;

import lombok.Data;

/**
 * 文件响应 DTO
 * <p>
 * 包含文件的基本信息，用于文件列表展示
 * </p>
 */
@Data
public class FileResponse {

    /**
     * 文件 ID
     */
    private Long id;

    /**
     * 原始文件名
     */
    private String originalName;

    /**
     * 文件大小（字节）
     */
    private Long fileSize;

    /**
     * 文件 MIME 类型
     */
    private String mimeType;

    /**
     * 上传者名称
     */
    private String uploaderName;

    /**
     * 上传状态
     * 0: 正在上传
     * 1: 已完成
     * 2: 上传失败
     */
    private Integer uploadState;

    /**
     * 创建时间（时间戳，毫秒）
     */
    private Long createdAt;
}
