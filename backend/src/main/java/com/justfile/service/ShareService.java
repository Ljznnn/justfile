package com.justfile.service;

import com.justfile.common.Constants;
import com.justfile.common.ErrorCode;
import com.justfile.dto.request.CreateShareRequest;
import com.justfile.dto.request.JoinShareRequest;
import com.justfile.dto.request.UpdateShareNameRequest;
import com.justfile.dto.response.MemberResponse;
import com.justfile.dto.response.ShareInfoResponse;
import com.justfile.dto.response.ShareResponse;
import com.justfile.entity.Share;
import com.justfile.entity.ShareMember;
import com.justfile.entity.FileEntity;
import com.justfile.exception.BusinessException;
import com.justfile.mapper.ShareMapper;
import com.justfile.mapper.ShareMemberMapper;
import com.justfile.mapper.FileMapper;
import com.justfile.mapper.OperationLogMapper;
import com.justfile.util.ShareCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 分享服务
 * <p>
 * 提供分享会话的创建、查询、加入、关闭等业务逻辑
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ShareService {

    private final ShareMapper shareMapper;
    private final ShareMemberMapper memberMapper;
    private final FileMapper fileMapper;
    private final OperationLogMapper logMapper;

    /**
     * 密码加密器
     */
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    /**
     * 分享码长度
     */
    @Value("${share.code-length:6}")
    private int codeLength;

    /**
     * 默认过期时长（小时）
     */
    @Value("${share.default-expire-hours:72}")
    private int defaultExpireHours;

    /**
     * 最大过期时长（小时）
     */
    @Value("${share.max-expire-hours:168}")
    private int maxExpireHours;

    /**
     * 创建新分享
     * <p>
     * 生成唯一分享码，创建分享记录，并将创建者添加为第一个成员
     * </p>
     *
     * @param request    创建分享请求
     * @param fingerprint 创建者指纹
     * @param ipAddress   创建者 IP 地址
     * @return 分享响应
     */
    @Transactional
    public ShareResponse createShare(CreateShareRequest request, String fingerprint, String ipAddress) {
        // 生成唯一分享码
        String shareCode;
        do {
            shareCode = ShareCodeGenerator.generate(codeLength);
        } while (shareMapper.selectByShareCode(shareCode) != null);

        // 创建分享实体
        Share share = new Share();
        share.setShareCode(shareCode);
        share.setShareName(request.getShareName());
        share.setCreatorFingerprint(fingerprint);
        share.setShareMode(request.getShareMode() != null ? request.getShareMode() : Constants.SHARE_MODE_CREATOR_ONLY);
        share.setStatus(Constants.SHARE_STATUS_ACTIVE);

        // 设置密码（如果提供）
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            share.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        // 设置过期时间
        Integer expireHours = request.getExpiresInHours();
        if (expireHours != null && expireHours > 0) {
            if (expireHours > maxExpireHours) {
                expireHours = maxExpireHours;
            }
            share.setExpiresAt(LocalDateTime.now().plusHours(expireHours));
        }

        shareMapper.insert(share);

        // 将创建者添加为第一个成员
        ShareMember creator = new ShareMember();
        creator.setShareId(share.getId());
        creator.setMemberFingerprint(fingerprint);
        creator.setMemberName(request.getCreatorName() != null ? request.getCreatorName() : "创建者");
        creator.setRole(Constants.MEMBER_ROLE_CREATOR);
        memberMapper.insert(creator);

        // 记录操作日志
        logOperation(share.getId(), fingerprint, Constants.OP_CREATE_SHARE,
                Constants.RESOURCE_SHARE, share.getId(), ipAddress, "shareCode=" + shareCode);

        log.info("已创建分享: code={}, creator={}", shareCode, fingerprint);

        return buildShareResponse(share, List.of(creator));
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
    public ShareInfoResponse getShareInfo(String shareCode) {
        Share share = getByCode(shareCode);
        validateShareActive(share);

        ShareInfoResponse response = new ShareInfoResponse();
        response.setShareCode(share.getShareCode());
        response.setShareName(share.getShareName());
        response.setShareMode(share.getShareMode());
        response.setHasPassword(share.getPasswordHash() != null);
        response.setExpiresAt(share.getExpiresAt());
        response.setMemberCount(memberMapper.selectByShareId(share.getId()).size());
        response.setFileCount(fileMapper.selectByShareId(share.getId()).size());

        return response;
    }

    /**
     * 加入分享
     * <p>
     * 验证密码，添加新成员或更新现有成员的活跃时间
     * </p>
     *
     * @param shareCode  分享码
     * @param request    加入分享请求
     * @param fingerprint 成员指纹
     * @param ipAddress   成员 IP 地址
     * @return 分享响应
     */
    @Transactional
    public ShareResponse joinShare(String shareCode, JoinShareRequest request, String fingerprint, String ipAddress) {
        Share share = getByCode(shareCode);
        validateShareActive(share);

        // 验证密码（如果需要）
        if (share.getPasswordHash() != null) {
            if (request.getPassword() == null || request.getPassword().isEmpty()) {
                throw new BusinessException(ErrorCode.SHARE_PASSWORD_REQUIRED);
            }
            if (!passwordEncoder.matches(request.getPassword(), share.getPasswordHash())) {
                throw new BusinessException(ErrorCode.SHARE_PASSWORD_INVALID);
            }
        }

        // 检查是否已是成员
        ShareMember existingMember = memberMapper.selectByShareIdAndFingerprint(share.getId(), fingerprint);
        if (existingMember != null) {
            // 更新最后活跃时间
            existingMember.setLastActiveAt(LocalDateTime.now());
            memberMapper.updateById(existingMember);
            return buildShareResponse(share, memberMapper.selectByShareId(share.getId()));
        }

        // 添加为新成员
        ShareMember member = new ShareMember();
        member.setShareId(share.getId());
        member.setMemberFingerprint(fingerprint);
        member.setMemberName(request.getMemberName() != null ? request.getMemberName() : "匿名用户");
        member.setRole(Constants.MEMBER_ROLE_PARTICIPANT);
        memberMapper.insert(member);

        // 记录操作日志
        logOperation(share.getId(), fingerprint, Constants.OP_JOIN_SHARE,
                Constants.RESOURCE_SHARE, share.getId(), ipAddress, "memberName=" + member.getMemberName());

        log.info("成员加入分享: code={}, member={}", shareCode, fingerprint);

        return buildShareResponse(share, memberMapper.selectByShareId(share.getId()));
    }

    /**
     * 关闭分享
     * <p>
     * 仅创建者可以关闭分享
     * </p>
     *
     * @param shareCode  分享码
     * @param fingerprint 操作者指纹
     */
    @Transactional
    public void closeShare(String shareCode, String fingerprint) {
        Share share = getByCode(shareCode);

        if (!isCreator(share.getId(), fingerprint)) {
            throw new BusinessException(ErrorCode.NOT_CREATOR);
        }

        share.setStatus(Constants.SHARE_STATUS_CLOSED);
        shareMapper.updateById(share);

        // 记录操作日志
        logOperation(share.getId(), fingerprint, Constants.OP_CLOSE_SHARE,
                Constants.RESOURCE_SHARE, share.getId(), null, null);

        log.info("分享已关闭: code={}", shareCode);
    }

    /**
     * 更新分享名称
     * <p>
     * 仅创建者可以修改分享名称
     * </p>
     *
     * @param shareCode  分享码
     * @param request    更新请求
     * @param fingerprint 操作者指纹
     */
    @Transactional
    public void updateShareName(String shareCode, UpdateShareNameRequest request, String fingerprint) {
        Share share = getByCode(shareCode);

        if (!isCreator(share.getId(), fingerprint)) {
            throw new BusinessException(ErrorCode.NOT_CREATOR);
        }

        share.setShareName(request.getShareName());
        shareMapper.updateById(share);

        log.info("分享名称已更新: code={}, name={}", shareCode, request.getShareName());
    }

    /**
     * 根据分享码获取分享实体
     *
     * @param shareCode 分享码
     * @return 分享实体
     * @throws BusinessException 如果分享不存在
     */
    public Share getByCode(String shareCode) {
        Share share = shareMapper.selectByShareCode(shareCode);
        if (share == null) {
            throw new BusinessException(ErrorCode.SHARE_NOT_FOUND);
        }
        return share;
    }

    /**
     * 验证分享是否活跃
     *
     * @param share 分享实体
     * @throws BusinessException 如果分享已关闭或过期
     */
    public void validateShareActive(Share share) {
        if (share.getStatus() == Constants.SHARE_STATUS_CLOSED) {
            throw new BusinessException(ErrorCode.SHARE_CLOSED);
        }
        if (share.getStatus() == Constants.SHARE_STATUS_EXPIRED ||
            (share.getExpiresAt() != null && share.getExpiresAt().isBefore(LocalDateTime.now()))) {
            throw new BusinessException(ErrorCode.SHARE_EXPIRED);
        }
    }

    /**
     * 检查指纹是否为分享成员
     *
     * @param shareId    分享 ID
     * @param fingerprint 成员指纹
     * @return 是否为成员
     */
    public boolean isMember(Long shareId, String fingerprint) {
        return memberMapper.selectByShareIdAndFingerprint(shareId, fingerprint) != null;
    }

    /**
     * 检查指纹是否为分享创建者
     *
     * @param shareId    分享 ID
     * @param fingerprint 成员指纹
     * @return 是否为创建者
     */
    public boolean isCreator(Long shareId, String fingerprint) {
        ShareMember member = memberMapper.selectByShareIdAndFingerprint(shareId, fingerprint);
        return member != null && member.getRole() == Constants.MEMBER_ROLE_CREATOR;
    }

    /**
     * 记录操作日志
     *
     * @param shareId       分享 ID
     * @param fingerprint    操作者指纹
     * @param operationType 操作类型
     * @param resourceType  资源类型
     * @param resourceId    资源 ID
     * @param ipAddress     IP 地址
     * @param detail        操作详情
     */
    private void logOperation(Long shareId, String fingerprint, String operationType,
                              String resourceType, Long resourceId, String ipAddress, String detail) {
        // TODO: 实现操作日志记录
    }

    /**
     * 构建分享响应
     *
     * @param share  分享实体
     * @param members 成员列表
     * @return 分享响应
     */
    private ShareResponse buildShareResponse(Share share, List<ShareMember> members) {
        ShareResponse response = new ShareResponse();
        response.setShareId(share.getId());
        response.setShareCode(share.getShareCode());
        response.setShareName(share.getShareName());
        response.setShareMode(share.getShareMode());
        response.setExpiresAt(share.getExpiresAt());
        response.setCreatedAt(share.getCreatedAt());
        response.setMembers(members.stream()
                .map(m -> {
                    MemberResponse mr = new MemberResponse();
                    mr.setId(m.getId());
                    mr.setMemberName(m.getMemberName());
                    mr.setRole(m.getRole());
                    mr.setJoinedAt(m.getJoinedAt());
                    return mr;
                })
                .collect(Collectors.toList()));
        return response;
    }
}