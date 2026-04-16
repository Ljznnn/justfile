package com.justfile.util;

import java.security.SecureRandom;
import java.util.Random;

/**
 * 分享码生成器
 * <p>
 * 用于生成唯一且易于识别的分享码
 * 排除了容易混淆的字符（如 I、O、0、1）
 * </p>
 */
public class ShareCodeGenerator {

    /**
     * 可用字符集
     * 排除了容易混淆的字符：I、O、0、1
     */
    private static final String CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /**
     * 随机数生成器
     * 使用 SecureRandom 保证安全性
     */
    private static final Random random = new SecureRandom();

    /**
     * 生成指定长度的分享码
     *
     * @param length 分享码长度
     * @return 生成的分享码
     */
    public static String generate(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
        }
        return sb.toString();
    }

    /**
     * 生成默认长度的分享码（6 位）
     *
     * @return 生成的分享码
     */
    public static String generateDefault() {
        return generate(6);
    }
}