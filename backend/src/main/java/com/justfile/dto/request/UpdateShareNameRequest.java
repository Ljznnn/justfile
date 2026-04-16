package com.justfile.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新分享名称请求 DTO
 * <p>
 * 仅创建者可以修改分享名称
 * </p>
 */
@Data
public class UpdateShareNameRequest {

    /**
     * 分享名称
     * 类似群组名称，最大 100 个字符
     */
    @Size(max = 100, message = "分享名称最多 100 个字符")
    private String shareName;
}
