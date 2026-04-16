package com.justfile.common;

import lombok.Getter;

/**
 * 错误码枚举类
 * <p>
 * 定义系统中所有业务错误码及其对应的错误消息
 * </p>
 */
@Getter
public enum ErrorCode {

    // ==================== 分享相关错误 ====================

    /** 分享不存在 */
    SHARE_NOT_FOUND(404, "分享不存在"),

    /** 分享已过期 */
    SHARE_EXPIRED(410, "分享已过期"),

    /** 分享已关闭 */
    SHARE_CLOSED(403, "分享已关闭"),

    /** 分享需要密码 */
    SHARE_PASSWORD_REQUIRED(401, "此分享需要密码"),

    /** 分享密码错误 */
    SHARE_PASSWORD_INVALID(401, "密码错误"),

    /** 分享已存在 */
    SHARE_ALREADY_EXISTS(409, "分享已存在"),

    // ==================== 成员相关错误 ====================

    /** 不是分享成员 */
    NOT_MEMBER(403, "您不是此分享的成员"),

    /** 不是分享创建者 */
    NOT_CREATOR(403, "只有创建者可以执行此操作"),

    /** 不允许上传 */
    UPLOAD_NOT_ALLOWED(403, "当前分享模式不允许上传"),

    // ==================== 文件相关错误 ====================

    /** 文件不存在 */
    FILE_NOT_FOUND(404, "文件不存在"),

    /** 文件正在上传中 */
    FILE_UPLOAD_IN_PROGRESS(400, "文件正在上传中"),

    /** 不允许删除文件 */
    FILE_DELETE_NOT_ALLOWED(403, "只有上传者或创建者可以删除文件"),

    /** 文件过大 */
    FILE_TOO_LARGE(413, "文件大小超过限制"),

    // ==================== Tus 协议相关错误 ====================

    /** Tus 上传会话不存在 */
    TUS_UPLOAD_NOT_FOUND(404, "上传会话不存在"),

    /** Tus 上传会话已过期 */
    TUS_UPLOAD_EXPIRED(410, "上传会话已过期"),

    /** Tus 偏移量不匹配 */
    TUS_OFFSET_MISMATCH(400, "上传偏移量不匹配"),

    /** Tus 数据块无效 */
    TUS_INVALID_CHUNK(400, "无效的数据块"),

    // ==================== 通用错误 ====================

    /** 请求参数无效 */
    INVALID_REQUEST(400, "请求参数无效"),

    /** 服务器内部错误 */
    INTERNAL_ERROR(500, "服务器内部错误");

    /**
     * 错误码
     */
    private final int code;

    /**
     * 错误消息
     */
    private final String message;

    /**
     * 构造函数
     *
     * @param code    错误码
     * @param message 错误消息
     */
    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
