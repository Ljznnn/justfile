package com.justfile;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

/**
 * JustFile 应用程序主入口类
 * <p>
 * 负责启动 Spring Boot 应用，配置组件扫描和定时任务
 * </p>
 */
@SpringBootApplication
@MapperScan("com.justfile.mapper")
@EnableScheduling
public class JustFileApplication {

    /**
     * 应用程序主入口方法
     *
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        // 设置 JVM 默认时区为东八区
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Shanghai"));
        SpringApplication.run(JustFileApplication.class, args);
    }
}
