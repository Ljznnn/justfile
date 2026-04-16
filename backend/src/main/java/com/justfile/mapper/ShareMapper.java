package com.justfile.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.justfile.entity.Share;
import org.apache.ibatis.annotations.Mapper;

/**
 * 分享 Mapper 接口
 * <p>
 * 提供分享表的数据访问操作
 * </p>
 */
@Mapper
public interface ShareMapper extends BaseMapper<Share> {

    /**
     * 根据分享码查询分享
     *
     * @param shareCode 分享码
     * @return 分享实体，不存在则返回 null
     */
    Share selectByShareCode(String shareCode);
}