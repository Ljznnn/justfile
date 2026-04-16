package com.justfile.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 成员响应 DTO
 * <p>
 * 包含分享成员的基本信息
 * </p>
 */
@Data
public class MemberResponse {

    /**
     * 成员 ID
     */
    private Long id;

    /**
     * 成员名称
     */
    private String memberName;

    /**
     * 成员角色
     * 0: 参与者
     * 1: 创建者
     */
    private Integer role;

    /**
     * 加入时间
     */
    private LocalDateTime joinedAt;
}