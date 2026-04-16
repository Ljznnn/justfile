package com.justfile.storage;

import java.io.InputStream;

/**
 * 存储策略接口
 * <p>
 * 定义文件存储的统一接口，支持多种存储后端（本地、OSS、HDFS）
 * </p>
 */
public interface StorageStrategy {

    /**
     * 存储文件并返回存储路径
     *
     * @param inputStream 文件内容输入流
     * @param filename    原始文件名
     * @param shareId     分享 ID，用于组织文件目录
     * @return 存储路径
     * @throws Exception 存储过程中发生的异常
     */
    String store(InputStream inputStream, String filename, String shareId) throws Exception;

    /**
     * 根据存储路径获取文件
     *
     * @param storagePath 存储路径
     * @return 文件输入流
     * @throws Exception 获取文件过程中发生的异常
     */
    InputStream retrieve(String storagePath) throws Exception;

    /**
     * 根据存储路径删除文件
     *
     * @param storagePath 存储路径
     * @throws Exception 删除文件过程中发生的异常
     */
    void delete(String storagePath) throws Exception;

    /**
     * 检查文件是否存在
     *
     * @param storagePath 存储路径
     * @return 文件是否存在
     */
    boolean exists(String storagePath);

    /**
     * 获取存储类型名称
     *
     * @return 存储类型（LOCAL、OSS、HDFS）
     */
    String getType();

    /**
     * 追加数据到现有文件（用于 Tus 分块上传）
     *
     * @param storagePath 存储路径
     * @param inputStream 要追加的数据
     * @param offset      追加的偏移量
     * @return 追加后的文件大小
     * @throws Exception 追加过程中发生的异常
     */
    long append(String storagePath, InputStream inputStream, long offset) throws Exception;
}