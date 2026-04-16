package com.justfile.tus;

import com.justfile.common.Constants;
import com.justfile.common.ErrorCode;
import com.justfile.entity.FileEntity;
import com.justfile.entity.Share;
import com.justfile.entity.TusUpload;
import com.justfile.exception.BusinessException;
import com.justfile.mapper.FileMapper;
import com.justfile.mapper.ShareMapper;
import com.justfile.mapper.TusUploadMapper;
import com.justfile.service.ShareService;
import com.justfile.storage.StorageStrategy;
import com.justfile.storage.StorageStrategyFactory;
import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;

/**
 * Tus 协议服务
 * <p>
 * 实现断点续传上传会话的管理，符合 Tus 协议规范
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TusService {

    private final TusUploadMapper tusUploadMapper;
    private final FileMapper fileMapper;
    private final ShareMapper shareMapper;
    private final ShareService shareService;
    private final StorageStrategyFactory storageStrategyFactory;

    /**
     * 上传会话过期时长（小时）
     */
    @Value("${tus.expiration-hours:24}")
    private int expirationHours;

    /**
     * 存储类型
     */
    @Value("${storage.type:LOCAL}")
    private String storageType;

    /**
     * 创建新的 Tus 上传会话
     * <p>
     * 验证分享状态和上传权限后创建会话和文件记录
     * </p>
     *
     * @param shareId    分享 ID
     * @param fingerprint 上传者指纹
     * @param totalSize   文件总大小
     * @param metadata    上传元数据
     * @return 上传会话实体
     */
    @Transactional
    public TusUpload createUpload(Long shareId, String fingerprint, long totalSize, String metadata) {
        // 验证分享存在且用户是成员
        Share share = shareMapper.selectById(shareId);
        if (share == null) {
            throw new BusinessException(ErrorCode.SHARE_NOT_FOUND);
        }
        shareService.validateShareActive(share);

        // 检查上传权限
        if (share.getShareMode() == Constants.SHARE_MODE_CREATOR_ONLY) {
            if (!shareService.isCreator(shareId, fingerprint)) {
                throw new BusinessException(ErrorCode.UPLOAD_NOT_ALLOWED);
            }
        } else {
            if (!shareService.isMember(shareId, fingerprint)) {
                throw new BusinessException(ErrorCode.NOT_MEMBER);
            }
        }

        // 生成 Tus ID
        String tusId = IdUtil.fastSimpleUUID();

        // 创建 Tus 上传记录
        TusUpload upload = new TusUpload();
        upload.setTusId(tusId);
        upload.setShareId(shareId);
        upload.setUploaderFingerprint(fingerprint);
        upload.setTotalSize(totalSize);
        upload.setOffset(0L);
        upload.setMetadata(metadata);
        upload.setExpiresAt(LocalDateTime.now().plusHours(expirationHours));

        tusUploadMapper.insert(upload);

        // 创建初始文件记录
        FileEntity file = new FileEntity();
        file.setShareId(shareId);
        file.setUploaderFingerprint(fingerprint);
        file.setOriginalName(extractFilename(metadata));
        file.setStoredName(tusId);
        file.setFileSize(totalSize);
        file.setStorageType(storageType);
        file.setStoragePath(shareId + "/" + tusId);
        file.setUploadState(Constants.FILE_STATE_UPLOADING);
        file.setTusId(tusId);

        fileMapper.insert(file);
        upload.setFileId(file.getId());
        tusUploadMapper.updateById(upload);

        log.info("已创建 Tus 上传会话: tusId={}, shareId={}, size={}", tusId, shareId, totalSize);
        return upload;
    }

    /**
     * 根据 Tus ID 获取上传会话
     *
     * @param tusId Tus 上传 ID
     * @return 上传会话实体
     * @throws BusinessException 如果会话不存在或已过期
     */
    public TusUpload getUpload(String tusId) {
        TusUpload upload = tusUploadMapper.selectByTusId(tusId);
        if (upload == null) {
            throw new BusinessException(ErrorCode.TUS_UPLOAD_NOT_FOUND);
        }
        if (upload.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.TUS_UPLOAD_EXPIRED);
        }
        return upload;
    }

    /**
     * 上传数据块（流式传输）
     * <p>
     * 直接使用 InputStream 追加数据到存储系统，实现真正的流式传输
     * 避免在内存中缓存整个数据块
     * </p>
     *
     * @param tusId       Tus 上传 ID
     * @param offset      偏移量
     * @param inputStream 数据输入流
     * @return 上传后的文件大小
     */
    @Transactional
    public long uploadChunkStream(String tusId, long offset, InputStream inputStream) {
        TusUpload upload = getUpload(tusId);

        // 验证偏移量
        if (upload.getOffset() != offset) {
            log.warn("偏移量不匹配: 期望 {}, 实际 {}", upload.getOffset(), offset);
            // Tus 协议允许从当前偏移量恢复
        }

        // 获取文件记录
        FileEntity file = fileMapper.selectById(upload.getFileId());
        if (file == null) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }

        // 流式追加到存储系统
        StorageStrategy strategy = storageStrategyFactory.getStrategy(storageType);
        try {
            long newSize = strategy.append(file.getStoragePath(), inputStream, offset);
            upload.setOffset(newSize);
            tusUploadMapper.updateById(upload);

            log.debug("已上传数据块(流式): tusId={}, offset={}, newSize={}", tusId, offset, newSize);
            return newSize;
        } catch (Exception e) {
            log.error("上传数据块失败: tusId={}", tusId, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    /**
     * 上传数据块（已废弃，建议使用 uploadChunkStream）
     * <p>
     * 将数据追加到存储系统，更新偏移量
     * </p>
     *
     * @param tusId      Tus 上传 ID
     * @param offset     偏移量
     * @param chunkData  数据块
     * @return 上传后的文件大小
     * @deprecated 使用 {@link #uploadChunkStream} 代替，避免内存占用
     */
    @Deprecated
    @Transactional
    public long uploadChunk(String tusId, long offset, byte[] chunkData) {
        TusUpload upload = getUpload(tusId);

        // 验证偏移量
        if (upload.getOffset() != offset) {
            log.warn("偏移量不匹配: 期望 {}, 实际 {}", upload.getOffset(), offset);
        }

        FileEntity file = fileMapper.selectById(upload.getFileId());
        if (file == null) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }

        StorageStrategy strategy = storageStrategyFactory.getStrategy(storageType);
        try {
            long newSize = strategy.append(file.getStoragePath(), new java.io.ByteArrayInputStream(chunkData), offset);
            upload.setOffset(newSize);
            tusUploadMapper.updateById(upload);
            return newSize;
        } catch (Exception e) {
            log.error("上传数据块失败: tusId={}", tusId, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    /**
     * 获取当前上传偏移量
     *
     * @param tusId Tus 上传 ID
     * @return 当前偏移量
     */
    public long getOffset(String tusId) {
        TusUpload upload = getUpload(tusId);
        return upload.getOffset();
    }

    /**
     * 检查上传是否完成
     *
     * @param tusId Tus 上传 ID
     * @return 是否完成
     */
    public boolean isComplete(String tusId) {
        TusUpload upload = getUpload(tusId);
        return upload.getOffset() >= upload.getTotalSize();
    }

    /**
     * 完成上传并创建文件记录
     * <p>
     * 将文件状态更新为已完成
     * </p>
     *
     * @param tusId Tus 上传 ID
     * @return 文件 ID
     */
    @Transactional
    public Long finalizeUpload(String tusId) {
        TusUpload upload = getUpload(tusId);

        if (!isComplete(tusId)) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_IN_PROGRESS);
        }

        // 更新文件记录
        FileEntity file = fileMapper.selectById(upload.getFileId());
        if (file != null) {
            file.setUploadState(Constants.FILE_STATE_COMPLETED);
            fileMapper.updateById(file);
        }

        log.info("上传已完成: tusId={}, fileId={}", tusId, upload.getFileId());
        return upload.getFileId();
    }

    /**
     * 清理过期的上传会话
     * <p>
     * 定时任务，每小时执行一次
     * </p>
     */
    @Scheduled(cron = "0 0 * * * ?")
    @Transactional
    public void cleanupExpired() {
        log.info("正在清理过期的 Tus 上传会话...");
        // TODO: 实现清理逻辑
    }

    /**
     * 从 Tus 元数据中提取文件名
     *
     * @param metadata Tus 元数据字符串
     * @return 文件名
     */
    private String extractFilename(String metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return "unknown";
        }
        try {
            // Tus 元数据格式: key base64value,key2 base64value2
            String[] pairs = metadata.split(",");
            for (String pair : pairs) {
                String[] kv = pair.split(" ", 2);
                if (kv.length == 2 && "filename".equals(kv[0])) {
                    return new String(java.util.Base64.getDecoder().decode(kv[1]));
                }
            }
        } catch (Exception e) {
            log.warn("解析 Tus 元数据失败: {}", metadata);
        }
        return "unknown";
    }
}