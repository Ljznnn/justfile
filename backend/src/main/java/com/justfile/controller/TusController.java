package com.justfile.controller;

import com.justfile.common.Constants;
import com.justfile.common.ErrorCode;
import com.justfile.entity.TusUpload;
import com.justfile.exception.BusinessException;
import com.justfile.tus.TusService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;

/**
 * Tus 协议控制器
 * <p>
 * 实现 Tus 开源可恢复文件上传协议，支持断点续传和流式传输
 * </p>
 */
@Slf4j
@RestController
@RequestMapping("/api/tus")
@RequiredArgsConstructor
public class TusController {

    private final TusService tusService;

    /**
     * 创建新的 Tus 上传会话
     * <p>
     * POST /api/tus
     * 请求头：Upload-Length（文件总大小）、Upload-Metadata（可选）、X-Fingerprint、X-Share-Id
     * </p>
     *
     * @param uploadLength 文件总大小
     * @param metadata     上传元数据（可选）
     * @param fingerprint  上传者指纹
     * @param shareId      分享 ID
     * @param request      HTTP 请求对象
     * @return 创建响应，包含上传位置
     */
    @PostMapping
    public ResponseEntity<Void> createUpload(
            @RequestHeader(Constants.HEADER_UPLOAD_LENGTH) Long uploadLength,
            @RequestHeader(value = Constants.HEADER_UPLOAD_METADATA, required = false) String metadata,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint,
            @RequestHeader("X-Share-Id") Long shareId,
            HttpServletRequest request) {

        log.info("创建 Tus 上传会话: shareId={}, size={}, fingerprint={}", shareId, uploadLength, fingerprint);

        TusUpload upload = tusService.createUpload(shareId, fingerprint, uploadLength, metadata);

        // 构建完整的绝对 URL 作为 Location
        String scheme = request.getScheme();
        String serverName = request.getServerName();
        int serverPort = request.getServerPort();
        String contextPath = request.getContextPath();

        StringBuilder location = new StringBuilder();
        location.append(scheme).append("://").append(serverName);

        // 如果不是标准端口，需要添加端口号
        if (("http".equals(scheme) && serverPort != 80) || ("https".equals(scheme) && serverPort != 443)) {
            location.append(":").append(serverPort);
        }

        location.append(contextPath).append("/api/tus/").append(upload.getTusId());

        String locationUrl = location.toString();

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .header(Constants.HEADER_LOCATION, locationUrl)
                .header(Constants.HEADER_UPLOAD_OFFSET, "0")
                .header(Constants.HEADER_TUS_RESUMABLE, Constants.TUS_VERSION)
                .build();
    }

    /**
     * 上传数据块（流式传输）
     * <p>
     * PATCH /api/tus/{tusId}
     * 请求头：Content-Type: application/offset+octet-stream、Upload-Offset（偏移量）
     * 直接将输入流传递给服务层，实现真正的流式传输，避免内存中缓存整个数据块
     * </p>
     *
     * @param tusId        Tus 上传 ID
     * @param uploadOffset 上传偏移量
     * @param contentType  内容类型
     * @param request      HTTP 请求对象
     * @return 上传响应，包含新的偏移量
     */
    @PatchMapping("/{tusId}")
    public ResponseEntity<Void> uploadChunk(
            @PathVariable String tusId,
            @RequestHeader(Constants.HEADER_UPLOAD_OFFSET) Long uploadOffset,
            @RequestHeader(Constants.HEADER_CONTENT_TYPE) String contentType,
            HttpServletRequest request) {

        // 验证内容类型
        if (!Constants.CONTENT_TYPE_OFFSET_STREAM.equals(contentType)) {
            throw new BusinessException(ErrorCode.TUS_INVALID_CHUNK);
        }

        // 使用流式传输：直接传递 InputStream，避免 readAllBytes() 占用内存
        long newOffset;
        try (InputStream inputStream = request.getInputStream()) {
            newOffset = tusService.uploadChunkStream(tusId, uploadOffset, inputStream);
        } catch (Exception e) {
            log.error("上传数据块失败: tusId={}", tusId, e);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }

        ResponseEntity.BodyBuilder response = ResponseEntity
                .status(HttpStatus.NO_CONTENT)
                .header(Constants.HEADER_UPLOAD_OFFSET, String.valueOf(newOffset))
                .header(Constants.HEADER_TUS_RESUMABLE, Constants.TUS_VERSION);

        // 检查上传是否完成
        if (tusService.isComplete(tusId)) {
            Long fileId = tusService.finalizeUpload(tusId);
            response.header("X-File-Id", String.valueOf(fileId));
        }

        return response.build();
    }

    /**
     * 获取上传状态（用于恢复上传）
     * <p>
     * HEAD /api/tus/{tusId}
     * </p>
     *
     * @param tusId Tus 上传 ID
     * @return 上传状态响应，包含当前偏移量和总大小
     */
    @RequestMapping(value = "/{tusId}", method = RequestMethod.HEAD)
    public ResponseEntity<Void> getUploadStatus(@PathVariable String tusId) {
        long offset = tusService.getOffset(tusId);
        TusUpload upload = tusService.getUpload(tusId);

        return ResponseEntity
                .ok()
                .header(Constants.HEADER_UPLOAD_OFFSET, String.valueOf(offset))
                .header(Constants.HEADER_UPLOAD_LENGTH, String.valueOf(upload.getTotalSize()))
                .header(Constants.HEADER_TUS_RESUMABLE, Constants.TUS_VERSION)
                .build();
    }
}