package com.justfile.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 操作日志实体类
 * <p>
 * 记录分享会话中的各种操作，用于审计和追踪
 * </p>
 */
@Data
@TableName("operation_log")
public class OperationLog {

    /**
     * 日志 ID（主键，自增）
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 所属分享 ID
     */
    private Long shareId;

    /**
     * 操作者指纹
     */
    private String memberFingerprint;

    /**
     * 操作类型
     * 如：CREATE_SHARE、JOIN_SHARE、UPLOAD_FILE 等
     */
    private String operationType;

    /**
     * 资源类型
     * SHARE 或 FILE
     */
    private String resourceType;

    /**
     * 资源 ID
     */
    private Long resourceId;

    /**
     * 操作详情
     * JSON 格式的详细信息
     */
    private String operationDetail;

    /**
     * 操作者 IP 地址
     */
    private String ipAddress;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
}