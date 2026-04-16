package com.justfile.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.justfile.entity.OperationLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 操作日志 Mapper 接口
 * <p>
 * 提供操作日志表的数据访问操作
 * </p>
 */
@Mapper
public interface OperationLogMapper extends BaseMapper<OperationLog> {
}