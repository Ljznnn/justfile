package com.justfile.storage;

import com.justfile.common.ErrorCode;
import com.justfile.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 存储策略工厂
 * <p>
 * 根据存储类型获取对应的存储策略实现
 * </p>
 */
@Slf4j
@Component
public class StorageStrategyFactory {

    /**
     * 存储策略映射表
     * 键为存储类型，值为对应的存储策略实现
     */
    private final Map<String, StorageStrategy> strategies = new HashMap<>();

    /**
     * 构造函数，自动注入所有存储策略实现
     *
     * @param strategyList 所有存储策略实现的列表
     */
    @Autowired
    public StorageStrategyFactory(List<StorageStrategy> strategyList) {
        for (StorageStrategy strategy : strategyList) {
            strategies.put(strategy.getType(), strategy);
            log.info("已注册存储策略: {}", strategy.getType());
        }
    }

    /**
     * 根据存储类型获取存储策略
     *
     * @param type 存储类型（LOCAL、OSS、HDFS）
     * @return 对应的存储策略实现
     * @throws BusinessException 如果找不到对应的存储策略
     */
    public StorageStrategy getStrategy(String type) {
        StorageStrategy strategy = strategies.get(type);
        if (strategy == null) {
            log.warn("未找到存储策略: {}, 使用默认 LOCAL", type);
            strategy = strategies.get("LOCAL");
        }
        if (strategy == null) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
        return strategy;
    }

    /**
     * 获取默认存储策略（本地存储）
     *
     * @return 本地存储策略实现
     */
    public StorageStrategy getDefaultStrategy() {
        return getStrategy("LOCAL");
    }
}