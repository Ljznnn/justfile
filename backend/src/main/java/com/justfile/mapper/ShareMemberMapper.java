package com.justfile.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.justfile.entity.ShareMember;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * 分享成员 Mapper 接口
 * <p>
 * 提供分享成员表的数据访问操作
 * </p>
 */
@Mapper
public interface ShareMemberMapper extends BaseMapper<ShareMember> {

    /**
     * 根据分享 ID 和成员指纹查询成员
     *
     * @param shareId     分享 ID
     * @param fingerprint 成员指纹
     * @return 成员实体，不存在则返回 null
     */
    ShareMember selectByShareIdAndFingerprint(Long shareId, String fingerprint);

    /**
     * 根据分享 ID 查询所有成员
     *
     * @param shareId 分享 ID
     * @return 成员列表
     */
    List<ShareMember> selectByShareId(Long shareId);
}