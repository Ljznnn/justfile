package com.justfile.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 分享实体类
 * <p>
 * 表示一个文件分享会话，包含分享码、密码、创建者信息、过期时间等
 * </p>
 */
@Data
@TableName("share")
public class Share {

    /**
     * 分享 ID（主键，自增）
     */
    @TableId(type = IdType.AUTO)
    private Long id;

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
     * 密码哈希值
     * 可选，用于保护分享
     */
    private String passwordHash;

    /**
     * 创建者指纹
     * 用于识别分享创建者
     */
    private String creatorFingerprint;

    /**
     * 分享模式
     * 0: 仅创建者可上传
     * 1: 所有成员可上传
     */
    private Integer shareMode;

    /**
     * 过期时间
     * null 表示永不过期
     */
    private LocalDateTime expiresAt;

    /**
     * 分享状态
     * 0: 已关闭
     * 1: 活跃
     * 2: 已过期
     */
    private Integer status;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}