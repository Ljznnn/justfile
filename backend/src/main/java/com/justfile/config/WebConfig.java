package com.justfile.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 配置类
 * <p>
 * 配置跨域请求（CORS）等 Web 相关设置
 * </p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * 配置跨域请求映射
     * <p>
     * 允许来自 Electron 应用和本地开发服务器的跨域请求
     * 暴露 Tus 协议相关的响应头
     * </p>
     *
     * @param registry CORS 配置注册器
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                // 允许的来源：Electron 应用和本地开发服务器
                .allowedOrigins("app://-", "http://localhost:5173", "http://127.0.0.1:5173")
                // 允许的 HTTP 方法
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")
                // 允许所有请求头
                .allowedHeaders("*")
                // 暴露给客户端的响应头（Tus 协议需要）
                .exposedHeaders("Location", "Upload-Offset", "Upload-Length", "Tus-Resumable", "X-File-Id")
                // 允许携带凭证
                .allowCredentials(true)
                // 预检请求缓存时间（秒）
                .maxAge(3600);
    }
}
