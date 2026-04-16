package com.justfile.controller;

import com.justfile.common.Constants;
import com.justfile.common.Result;
import com.justfile.dto.request.CreateShareRequest;
import com.justfile.dto.request.JoinShareRequest;
import com.justfile.dto.request.UpdateShareNameRequest;
import com.justfile.dto.response.ShareInfoResponse;
import com.justfile.dto.response.ShareResponse;
import com.justfile.service.ShareService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 分享控制器
 * <p>
 * 提供分享会话的创建、查询、加入、关闭等 API
 * </p>
 */
@RestController
@RequestMapping("/api/shares")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    /**
     * 创建新分享
     * <p>
     * 生成唯一分享码，创建分享会话，并将创建者添加为第一个成员
     * </p>
     *
     * @param request     创建分享请求
     * @param fingerprint  创建者指纹（从请求头获取）
     * @param httpRequest  HTTP 请求对象
     * @return 分享响应
     */
    @PostMapping
    public Result<ShareResponse> createShare(
            @Valid @RequestBody CreateShareRequest request,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint,
            HttpServletRequest httpRequest) {
        String ipAddress = getClientIp(httpRequest);
        ShareResponse response = shareService.createShare(request, fingerprint, ipAddress);
        return Result.success(response);
    }

    /**
     * 获取分享信息
     * <p>
     * 返回分享的基本信息，用于加入分享前展示
     * </p>
     *
     * @param shareCode 分享码
     * @return 分享信息响应
     */
    @GetMapping("/{shareCode}")
    public Result<ShareInfoResponse> getShareInfo(@PathVariable String shareCode) {
        ShareInfoResponse response = shareService.getShareInfo(shareCode);
        return Result.success(response);
    }

    /**
     * 加入分享
     * <p>
     * 验证密码后加入分享会话
     * </p>
     *
     * @param shareCode   分享码
     * @param request     加入分享请求
     * @param fingerprint  成员指纹（从请求头获取）
     * @param httpRequest  HTTP 请求对象
     * @return 分享响应
     */
    @PostMapping("/{shareCode}/join")
    public Result<ShareResponse> joinShare(
            @PathVariable String shareCode,
            @Valid @RequestBody JoinShareRequest request,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint,
            HttpServletRequest httpRequest) {
        String ipAddress = getClientIp(httpRequest);
        ShareResponse response = shareService.joinShare(shareCode, request, fingerprint, ipAddress);
        return Result.success(response);
    }

    /**
     * 关闭分享
     * <p>
     * 仅创建者可以关闭分享
     * </p>
     *
     * @param shareCode   分享码
     * @param fingerprint  操作者指纹（从请求头获取）
     * @return 成功响应
     */
    @DeleteMapping("/{shareCode}")
    public Result<Void> closeShare(
            @PathVariable String shareCode,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint) {
        shareService.closeShare(shareCode, fingerprint);
        return Result.success();
    }

    /**
     * 更新分享名称
     * <p>
     * 仅创建者可以修改分享名称，所有人可见
     * </p>
     *
     * @param shareCode   分享码
     * @param request     更新请求
     * @param fingerprint  操作者指纹（从请求头获取）
     * @return 成功响应
     */
    @PatchMapping("/{shareCode}/name")
    public Result<Void> updateShareName(
            @PathVariable String shareCode,
            @Valid @RequestBody UpdateShareNameRequest request,
            @RequestHeader(Constants.HEADER_FINGERPRINT) String fingerprint) {
        shareService.updateShareName(shareCode, request, fingerprint);
        return Result.success();
    }

    /**
     * 获取客户端真实 IP 地址
     * <p>
     * 支持代理服务器场景，从 X-Forwarded-For 或 X-Real-IP 头获取
     * </p>
     *
     * @param request HTTP 请求对象
     * @return 客户端 IP 地址
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 如果有多个 IP（代理场景），取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}