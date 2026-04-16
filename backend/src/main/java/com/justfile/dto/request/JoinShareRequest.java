package com.justfile.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 加入分享请求 DTO
 * <p>
 * 包含加入分享会话所需的参数
 * </p>
 */
@Data
public class JoinShareRequest {

    /**
     * 分享密码
     * 如果分享设置了密码保护，则必须提供
     * 最大 32 个字符
     */
    @Size(max = 32, message = "密码最多 32 个字符")
    private String password;

    /**
     * 成员名称
     * 可选，用于在分享中显示成员名称
     * 最大 50 个字符
     */
    @Size(max = 50, message = "成员名称最多 50 个字符")
    private String memberName;
}