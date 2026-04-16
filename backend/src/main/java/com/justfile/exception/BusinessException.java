package com.justfile.exception;

import com.justfile.common.ErrorCode;
import lombok.Getter;

/**
 * 业务异常类
 * <p>
 * 用于表示业务逻辑中的异常情况，包含错误码和错误消息
 * </p>
 */
@Getter
public class BusinessException extends RuntimeException {

    /**
     * 错误码
     */
    private final int code;

    /**
     * 使用错误码枚举构造业务异常
     *
     * @param errorCode 错误码枚举
     */
    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
    }

    /**
     * 使用自定义错误码和消息构造业务异常
     *
     * @param code    错误码
     * @param message 错误消息
     */
    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}