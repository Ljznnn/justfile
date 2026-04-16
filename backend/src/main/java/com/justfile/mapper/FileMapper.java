package com.justfile.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.justfile.entity.FileEntity;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/**
 * 文件 Mapper 接口
 * <p>
 * 提供文件表的数据访问操作
 * </p>
 */
@Mapper
public interface FileMapper extends BaseMapper<FileEntity> {

    /**
     * 根据分享 ID 查询所有文件
     *
     * @param shareId 分享 ID
     * @return 文件列表
     */
    List<FileEntity> selectByShareId(Long shareId);

    /**
     * 根据 Tus 上传 ID 查询文件
     *
     * @param tusId Tus 上传 ID
     * @return 文件实体，不存在则返回 null
     */
    FileEntity selectByTusId(String tusId);
}