package com.justfile.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 存储配置类
 * <p>
 * 配置文件存储策略，支持本地存储、阿里云 OSS 和 Hadoop HDFS
 * </p>
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "storage")
public class StorageConfig {

    /**
     * 存储类型
     * 可选值：LOCAL、OSS、HDFS
     */
    private String type = "LOCAL";

    /**
     * 本地存储配置
     */
    private LocalConfig local = new LocalConfig();

    /**
     * OSS 存储配置
     */
    private OssConfig oss = new OssConfig();

    /**
     * HDFS 存储配置
     */
    private HdfsConfig hdfs = new HdfsConfig();

    /**
     * 本地存储配置类
     */
    @Data
    public static class LocalConfig {

        /**
         * 本地存储基础路径
         */
        private String basePath = "./uploads";
    }

    /**
     * 阿里云 OSS 存储配置类
     */
    @Data
    public static class OssConfig {

        /**
         * OSS 服务端点
         */
        private String endpoint;

        /**
         * 访问密钥 ID
         */
        private String accessKey;

        /**
         * 访问密钥 Secret
         */
        private String secretKey;

        /**
         * 存储桶名称
         */
        private String bucketName;
    }

    /**
     * Hadoop HDFS 存储配置类
     */
    @Data
    public static class HdfsConfig {

        /**
         * HDFS NameNode 地址
         */
        private String namenode = "hdfs://localhost:9000";

        /**
         * HDFS 存储基础路径
         */
        private String basePath = "/justfile";
    }
}
