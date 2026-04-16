package com.justfile.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 分享信息响应 DTO
 * <p>
 * 包含分享会话的基本信息，用于加入分享前展示
 * </p>
 */
@Data
public class ShareInfoResponse {

    /**
     * 分享码
     */
    private String shareCode;

    /**
     * 分享名称
     * 类似群组名称
     */
    private String shareName;

    /**
     * 分享模式
     * 0: 仅创建者可上传
     * 1: 所有成员可上传
     */
    private Integer shareMode;

    /**
     * 是否需要密码
     */
    private Boolean hasPassword;

    /**
     * 过期时间
     */
    private LocalDateTime expiresAt;

    /**
     * 成员数量
     */
    private Integer memberCount;

    /**
     * 文件数量
     */
    private Integer fileCount;
}