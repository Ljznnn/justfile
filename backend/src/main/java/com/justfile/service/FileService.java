package com.justfile.service;

import com.justfile.common.Constants;
import com.justfile.common.ErrorCode;
import com.justfile.dto.response.FileResponse;
import com.justfile.entity.FileEntity;
import com.justfile.entity.ShareMember;
import com.justfile.exception.BusinessException;
import com.justfile.mapper.FileMapper;
import com.justfile.mapper.ShareMemberMapper;
import com.justfile.mapper.OperationLogMapper;
import com.justfile.storage.StorageStrategy;
import com.justfile.storage.StorageStrategyFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 文件服务
 * <p>
 * 提供文件的查询、下载、删除等业务逻辑
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    private final FileMapper fileMapper;
    private final ShareMemberMapper memberMapper;
    private final OperationLogMapper logMapper;
    private final StorageStrategyFactory storageFactory;
    private final ShareService shareService;

    /**
     * 根据分享 ID 获取文件列表
     * <p>
     * 只返回已完成上传的文件
     * </p>
     *
     * @param shareId 分享 ID
     * @return 文件响应列表
     */
    public List<FileResponse> getFilesByShareId(Long shareId) {
        List<FileEntity> files = fileMapper.selectByShareId(shareId);
        return files.stream()
                .filter(f -> f.getUploadState() == Constants.FILE_STATE_COMPLETED)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 根据文件 ID 获取文件实体
     *
     * @param fileId 文件 ID
     * @return 文件实体
     * @throws BusinessException 如果文件不存在
     */
    public FileEntity getFileById(Long fileId) {
        FileEntity file = fileMapper.selectById(fileId);
        if (file == null) {
            throw new BusinessException(ErrorCode.FILE_NOT_FOUND);
        }
        return file;
    }

    /**
     * 下载文件
     * <p>
     * 验证成员身份和文件状态后从存储系统获取文件
     * </p>
     *
     * @param fileId     文件 ID
     * @param fingerprint 下载者指纹
     * @return 文件输入流
     * @throws BusinessException 如果无权限或文件状态异常
     */
    public InputStream downloadFile(Long fileId, String fingerprint) {
        FileEntity file = getFileById(fileId);

        // 检查成员身份
        if (!shareService.isMember(file.getShareId(), fingerprint)) {
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        // 检查文件状态
        if (file.getUploadState() != Constants.FILE_STATE_COMPLETED) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_IN_PROGRESS);
        }

        // 从存储系统获取文件
        try {
            StorageStrategy strategy = storageFactory.getStrategy(file.getStorageType());
            return strategy.retrieve(file.getStoragePath());
        } catch (Exception e) {
            log.error("获取文件失败: fileId={}", fileId, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    /**
     * 删除文件
     * <p>
     * 只有上传者或创建者可以删除文件
     * </p>
     *
     * @param fileId     文件 ID
     * @param fingerprint 删除者指纹
     * @throws BusinessException 如果无权限
     */
    @Transactional
    public void deleteFile(Long fileId, String fingerprint) {
        FileEntity file = getFileById(fileId);

        // 检查权限：只有上传者或创建者可以删除
        ShareMember member = memberMapper.selectByShareIdAndFingerprint(file.getShareId(), fingerprint);
        if (member == null) {
            throw new BusinessException(ErrorCode.NOT_MEMBER);
        }

        boolean isUploader = file.getUploaderFingerprint().equals(fingerprint);
        boolean isCreator = member.getRole() == Constants.MEMBER_ROLE_CREATOR;

        if (!isUploader && !isCreator) {
            throw new BusinessException(ErrorCode.FILE_DELETE_NOT_ALLOWED);
        }

        // 从存储系统删除文件
        try {
            StorageStrategy strategy = storageFactory.getStrategy(file.getStorageType());
            strategy.delete(file.getStoragePath());
        } catch (Exception e) {
            log.warn("从存储系统删除文件失败: fileId={}, path={}", fileId, file.getStoragePath());
        }

        // 删除数据库记录
        fileMapper.deleteById(fileId);

        log.info("文件已删除: fileId={}, by={}", fileId, fingerprint);
    }

    /**
     * 将文件实体转换为响应 DTO
     *
     * @param file 文件实体
     * @return 文件响应
     */
    private FileResponse toResponse(FileEntity file) {
        FileResponse response = new FileResponse();
        response.setId(file.getId());
        response.setOriginalName(file.getOriginalName());
        response.setFileSize(file.getFileSize());
        response.setMimeType(file.getMimeType());
        response.setUploadState(file.getUploadState());
        response.setCreatedAt(file.getCreatedAt());

        // 获取上传者名称
        ShareMember uploader = memberMapper.selectByShareIdAndFingerprint(
                file.getShareId(), file.getUploaderFingerprint());
        response.setUploaderName(uploader != null ? uploader.getMemberName() : "未知用户");

        return response;
    }
}