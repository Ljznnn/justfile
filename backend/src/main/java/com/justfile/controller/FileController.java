package com.justfile.controller;

import com.justfile.common.Constants;
import com.justfile.common.Result;
import com.justfile.dto.response.FileResponse;
import com.justfile.entity.FileEntity;
import com.justfile.service.FileService;
import com.justfile.service.ShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 文件控制器
 * <p>
 * 提供文件列表查询、下载、删除等 API
 * </p>
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final ShareService shareService;

    /**
     * 获取分享的文件列表
     * <p>
     * 只返回已完成上传的文件
     * </p>
     *
     * @param shareId     分享 ID
     * @param fingerprint  成员指纹（从请求头获取）
     * @return 文件列表
     */
    @GetMapping("/share/{shareId}")
    public Result<List<FileResponse>> getFilesByShareId(
            @PathVariable Long shareId,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint) {

        // 验证成员身份
        if (!shareService.isMember(shareId, fingerprint)) {
            return Result.error(403, "不是此分享的成员");
        }

        List<FileResponse> files = fileService.getFilesByShareId(shareId);
        return Result.success(files);
    }

    /**
     * 下载文件
     * <p>
     * 验证成员身份后返回文件流
     * </p>
     *
     * @param fileId      文件 ID
     * @param fingerprint  下载者指纹（从请求头获取）
     * @return 文件流响应
     */
    @GetMapping("/{fileId}/download")
    public ResponseEntity<InputStreamResource> downloadFile(
            @PathVariable Long fileId,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint) {

        FileEntity file = fileService.getFileById(fileId);
        InputStream stream = fileService.downloadFile(fileId, fingerprint);

        // 构建响应头
        String encodedFilename = URLEncoder.encode(file.getOriginalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                file.getMimeType() != null ? file.getMimeType() : "application/octet-stream"));
        headers.setContentLength(file.getFileSize());
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename*=UTF-8''" + encodedFilename);

        return ResponseEntity.ok()
                .headers(headers)
                .body(new InputStreamResource(stream));
    }

    /**
     * 删除文件
     * <p>
     * 只有上传者或创建者可以删除文件
     * </p>
     *
     * @param fileId      文件 ID
     * @param fingerprint  删除者指纹（从请求头获取）
     * @return 成功响应
     */
    @DeleteMapping("/{fileId}")
    public Result<Void> deleteFile(
            @PathVariable Long fileId,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint) {

        fileService.deleteFile(fileId, fingerprint);
        return Result.success();
    }
}