package com.justfile.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 分享成员实体类
 * <p>
 * 表示分享会话中的成员，包含成员指纹、名称、角色等信息
 * </p>
 */
@Data
@TableName("share_member")
public class ShareMember {

    /**
     * 成员 ID（主键，自增）
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 所属分享 ID
     */
    private Long shareId;

    /**
     * 成员指纹
     * 用于唯一识别成员
     */
    private String memberFingerprint;

    /**
     * 成员名称
     * 显示名称，可为空
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

    /**
     * 最后活跃时间
     */
    private LocalDateTime lastActiveAt;
}