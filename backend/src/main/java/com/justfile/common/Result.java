package com.justfile.common;

import lombok.Data;

/**
 * 统一响应结果封装类
 * <p>
 * 用于封装所有 API 接口的返回结果，包含状态码、消息和数据
 * </p>
 *
 * @param <T> 响应数据的类型
 */
@Data
public class Result<T> {

    /**
     * 状态码
     * 200 表示成功，其他值表示各种错误
     */
    private int code;

    /**
     * 响应消息
     * 成功时为 "success"，失败时为错误描述
     */
    private String message;

    /**
     * 响应数据
     * 成功时包含实际数据，失败时通常为 null
     */
    private T data;

    /**
     * 创建成功响应（无数据）
     *
     * @param <T> 数据类型
     * @return 成功响应结果
     */
    public static <T> Result<T> success() {
        return success(null);
    }

    /**
     * 创建成功响应（带数据）
     *
     * @param data 响应数据
     * @param <T>  数据类型
     * @return 成功响应结果
     */
    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }

    /**
     * 创建错误响应
     *
     * @param code    错误码
     * @param message 错误消息
     * @param <T>     数据类型
     * @return 错误响应结果
     */
    public static <T> Result<T> error(int code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }

    /**
     * 创建错误响应（使用错误码枚举）
     *
     * @param errorCode 错误码枚举
     * @param <T>       数据类型
     * @return 错误响应结果
     */
    public static <T> Result<T> error(ErrorCode errorCode) {
        return error(errorCode.getCode(), errorCode.getMessage());
    }
}
