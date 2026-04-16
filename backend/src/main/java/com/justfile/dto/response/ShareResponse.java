package com.justfile.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 分享响应 DTO
 * <p>
 * 包含分享会话的完整信息，用于创建分享和加入分享的响应
 * </p>
 */
@Data
public class ShareResponse {

    /**
     * 分享 ID
     */
    private Long shareId;

    /**
     * 分享码
     * 用于访问分享的唯一标识符
     */
    private String shareCode;

    /**
     * 分享模式
     * 0: 仅创建者可上传
     * 1: 所有成员可上传
     */
    private Integer shareMode;

    /**
     * 过期时间
     */
    private LocalDateTime expiresAt;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 成员列表
     */
    private List<MemberResponse> members;
}