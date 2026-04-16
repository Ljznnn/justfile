package com.justfile.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.time.ZoneId;
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
     * 分享名称
     * 类似群组名称，所有人可见
     */
    private String shareName;

    /**
     * 分享模式
     * 0: 仅创建者可上传
     * 1: 所有成员可上传
     */
    private Integer shareMode;

    /**
     * 过期时间（时间戳，毫秒）
     */
    private Long expiresAt;

    /**
     * 创建时间（时间戳，毫秒）
     */
    private Long createdAt;

    /**
     * 当前用户是否为创建者
     */
    private Boolean creator;

    /**
     * 分享状态
     * 0: 已关闭
     * 1: 活跃中
     * 2: 已过期
     */
    private Integer status;

    /**
     * 成员列表
     */
    private List<MemberResponse> members;

    /**
     * 辅助方法：LocalDateTime 转时间戳
     * 使用系统默认时区
     */
    public static Long toTimestamp(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        return dateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
    }
}
