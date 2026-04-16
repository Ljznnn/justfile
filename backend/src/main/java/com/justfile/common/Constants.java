package com.justfile.common;

/**
 * 系统常量定义类
 * <p>
 * 包含分享状态、分享模式、成员角色、文件状态、存储类型、操作类型等常量定义
 * </p>
 */
public class Constants {

    // ==================== 分享状态常量 ====================

    /** 分享已关闭 */
    public static final int SHARE_STATUS_CLOSED = 0;

    /** 分享活跃中 */
    public static final int SHARE_STATUS_ACTIVE = 1;

    /** 分享已过期 */
    public static final int SHARE_STATUS_EXPIRED = 2;

    // ==================== 分享模式常量 ====================

    /** 仅创建者可上传 */
    public static final int SHARE_MODE_CREATOR_ONLY = 0;

    /** 所有成员可上传 */
    public static final int SHARE_MODE_ALL_MEMBERS = 1;

    // ==================== 成员角色常量 ====================

    /** 参与者角色 */
    public static final int MEMBER_ROLE_PARTICIPANT = 0;

    /** 创建者角色 */
    public static final int MEMBER_ROLE_CREATOR = 1;

    // ==================== 文件上传状态常量 ====================

    /** 文件正在上传 */
    public static final int FILE_STATE_UPLOADING = 0;

    /** 文件上传完成 */
    public static final int FILE_STATE_COMPLETED = 1;

    /** 文件上传失败 */
    public static final int FILE_STATE_FAILED = 2;

    // ==================== 存储类型常量 ====================

    /** 本地存储 */
    public static final String STORAGE_LOCAL = "LOCAL";

    /** 阿里云 OSS 存储 */
    public static final String STORAGE_OSS = "OSS";

    /** Hadoop HDFS 存储 */
    public static final String STORAGE_HDFS = "HDFS";

    // ==================== 操作类型常量 ====================

    /** 创建分享操作 */
    public static final String OP_CREATE_SHARE = "CREATE_SHARE";

    /** 加入分享操作 */
    public static final String OP_JOIN_SHARE = "JOIN_SHARE";

    /** 上传文件操作 */
    public static final String OP_UPLOAD_FILE = "UPLOAD_FILE";

    /** 下载文件操作 */
    public static final String OP_DOWNLOAD_FILE = "DOWNLOAD_FILE";

    /** 删除文件操作 */
    public static final String OP_DELETE_FILE = "DELETE_FILE";

    /** 关闭分享操作 */
    public static final String OP_CLOSE_SHARE = "CLOSE_SHARE";

    // ==================== 资源类型常量 ====================

    /** 分享资源 */
    public static final String RESOURCE_SHARE = "SHARE";

    /** 文件资源 */
    public static final String RESOURCE_FILE = "FILE";

    // ==================== HTTP 头常量 ====================

    /** 用户指纹头 */
    public static final String HEADER_FINGERPRINT = "X-Fingerprint";

    /** 上传总长度头（Tus 协议） */
    public static final String HEADER_UPLOAD_LENGTH = "Upload-Length";

    /** 上传偏移量头（Tus 协议） */
    public static final String HEADER_UPLOAD_OFFSET = "Upload-Offset";

    /** 上传元数据头（Tus 协议） */
    public static final String HEADER_UPLOAD_METADATA = "Upload-Metadata";

    /** Tus 协议版本头 */
    public static final String HEADER_TUS_RESUMABLE = "Tus-Resumable";

    /** Location 头 */
    public static final String HEADER_LOCATION = "Location";

    /** Content-Type 头 */
    public static final String HEADER_CONTENT_TYPE = "Content-Type";

    // ==================== Tus 协议常量 ====================

    /** Tus 协议版本号 */
    public static final String TUS_VERSION = "1.0.0";

    /** Tus 偏移量流内容类型 */
    public static final String CONTENT_TYPE_OFFSET_STREAM = "application/offset+octet-stream";
}
