import { DomainError } from '@core/shared/error/domain-error';
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/** 도메인 에러 코드를 HTTP 상태 코드로 매핑한다. 코어는 HTTP를 모른다. */
const STATUS_BY_CODE: Record<string, number> = {
    ALARM_NOT_FOUND: HttpStatus.NOT_FOUND,
    ALARM_NOT_SENDABLE: HttpStatus.CONFLICT,
    ALARM_NOT_CANCELLABLE: HttpStatus.CONFLICT,
    URGENT_RECIPIENTS_REQUIRED: HttpStatus.UNPROCESSABLE_ENTITY,
    URGENT_RECIPIENTS_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY,
    NORMAL_RECIPIENTS_NOT_ALLOWED: HttpStatus.UNPROCESSABLE_ENTITY,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const res = host.switchToHttp().getResponse<Response>();

        // 1. 도메인 규칙 위반 — 의도된 실패
        if (exception instanceof DomainError) {
            const statusCode = STATUS_BY_CODE[exception.code] ?? HttpStatus.BAD_REQUEST;

            res.status(statusCode).json({
                success: false,
                statusCode,
                message: exception.message,
                error: { code: exception.code, details: exception.details },
            });
            return;
        }

        // 2. DTO 검증 실패 등 NestJS 예외
        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const body = exception.getResponse() as Record<string, unknown>;

            res.status(statusCode).json({
                success: false,
                statusCode,
                message: 'Request validation failed',
                error: { code: 'VALIDATION_FAILED', details: body.message ?? body },
            });
            return;
        }

        // 3. 예상하지 못한 오류 — 버그 가능성이 있으므로 스택을 남기고 상세는 감춘다
        this.logger.error(exception);

        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: { code: 'INTERNAL_ERROR' },
        });
    }
}
