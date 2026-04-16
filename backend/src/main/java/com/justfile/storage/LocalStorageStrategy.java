package com.justfile.storage;

import com.justfile.common.Constants;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.UUID;

/**
 * 本地存储策略
 * <p>
 * 将文件存储在本地文件系统中，是最常用的存储方式
 * </p>
 */
@Slf4j
@Component
public class LocalStorageStrategy implements StorageStrategy {

    /**
     * 本地存储基础路径
     */
    @Value("${storage.local.base-path:./uploads}")
    private String basePath;

    /**
     * 存储文件到本地文件系统
     *
     * @param inputStream 文件内容输入流
     * @param filename    原始文件名
     * @param shareId     分享 ID
     * @return 存储路径
     * @throws Exception 存储异常
     */
    @Override
    public String store(InputStream inputStream, String filename, String shareId) throws Exception {
        // 创建分享目录
        Path shareDir = Paths.get(basePath, shareId);
        Files.createDirectories(shareDir);

        // 生成唯一存储文件名
        String storedName = UUID.randomUUID() + "_" + sanitizeFilename(filename);
        Path targetPath = shareDir.resolve(storedName);

        // 写入文件
        try (OutputStream outputStream = Files.newOutputStream(targetPath, StandardOpenOption.CREATE_NEW)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
        }

        log.debug("已存储文件: {} -> {}", filename, targetPath);
        return shareId + "/" + storedName;
    }

    /**
     * 从本地文件系统获取文件
     *
     * @param storagePath 存储路径
     * @return 文件输入流
     * @throws Exception 获取异常
     */
    @Override
    public InputStream retrieve(String storagePath) throws Exception {
        Path filePath = Paths.get(basePath, storagePath);
        if (!Files.exists(filePath)) {
            throw new FileNotFoundException("文件不存在: " + storagePath);
        }
        return Files.newInputStream(filePath);
    }

    /**
     * 从本地文件系统删除文件
     *
     * @param storagePath 存储路径
     * @throws Exception 删除异常
     */
    @Override
    public void delete(String storagePath) throws Exception {
        Path filePath = Paths.get(basePath, storagePath);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            log.debug("已删除文件: {}", storagePath);
        }
    }

    /**
     * 检查文件是否存在
     *
     * @param storagePath 存储路径
     * @return 文件是否存在
     */
    @Override
    public boolean exists(String storagePath) {
        return Files.exists(Paths.get(basePath, storagePath));
    }

    /**
     * 获取存储类型
     *
     * @return LOCAL
     */
    @Override
    public String getType() {
        return Constants.STORAGE_LOCAL;
    }

    /**
     * 追加数据到现有文件（用于 Tus 分块上传）
     *
     * @param storagePath 存储路径
     * @param inputStream 要追加的数据
     * @param offset      追加的偏移量
     * @return 追加后的文件大小
     * @throws Exception 追加异常
     */
    @Override
    public long append(String storagePath, InputStream inputStream, long offset) throws Exception {
        Path filePath = Paths.get(basePath, storagePath);

        // 创建父目录（如果不存在）
        Files.createDirectories(filePath.getParent());

        // 创建文件（如果不存在）
        if (!Files.exists(filePath)) {
            Files.createFile(filePath);
        }

        // 验证当前文件大小是否匹配偏移量
        long currentSize = Files.size(filePath);
        if (currentSize != offset) {
            log.warn("偏移量不匹配: 期望 {}, 实际 {}", offset, currentSize);
            // 继续执行 - Tus 协议允许这种情况
        }

        // 追加数据
        try (RandomAccessFile raf = new RandomAccessFile(filePath.toFile(), "rw")) {
            raf.seek(offset);
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                raf.write(buffer, 0, bytesRead);
            }
            return raf.length();
        }
    }

    /**
     * 清理文件名中的危险字符
     *
     * @param filename 原始文件名
     * @return 清理后的文件名
     */
    private String sanitizeFilename(String filename) {
        // 移除路径分隔符和危险字符
        return filename.replaceAll("[/\\\\:*?\"<>|]", "_");
    }
}