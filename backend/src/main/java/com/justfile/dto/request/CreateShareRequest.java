package com.justfile.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建分享请求 DTO
 * <p>
 * 包含创建新分享会话所需的参数
 * </p>
 */
@Data
public class CreateShareRequest {

    /**
     * 分享密码
     * 可选，最大 32 个字符
     */
    @Size(max = 32, message = "密码最多 32 个字符")
    private String password;

    /**
     * 分享模式
     * 0: 仅创建者可上传
     * 1: 所有成员可上传
     * 默认为 0
     */
    @Min(value = 0, message = "分享模式必须为 0 或 1")
    @Max(value = 1, message = "分享模式必须为 0 或 1")
    private Integer shareMode = 0;

    /**
     * 过期时长（小时）
     * 可选，不设置则使用默认值
     */
    private Integer expiresInHours;

    /**
     * 创建者名称
     * 可选，最大 50 个字符
     */
    @Size(max = 50, message = "创建者名称最多 50 个字符")
    private String creatorName;
}