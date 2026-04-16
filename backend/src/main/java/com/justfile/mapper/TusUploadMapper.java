package com.justfile.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.justfile.entity.TusUpload;
import org.apache.ibatis.annotations.Mapper;

/**
 * Tus 上传会话 Mapper 接口
 * <p>
 * 提供 Tus 上传会话表的数据访问操作
 * </p>
 */
@Mapper
public interface TusUploadMapper extends BaseMapper<TusUpload> {

    /**
     * 根据 Tus ID 查询上传会话
     *
     * @param tusId Tus 上传 ID
     * @return 上传会话实体，不存在则返回 null
     */
    TusUpload selectByTusId(String tusId);
}