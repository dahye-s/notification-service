export class CommonResponseDto<T> {
    readonly success: boolean;
    readonly statusCode: number;
    readonly message: string;
    readonly data?: T;

    constructor(statusCode: number, message: string, data?: T) {
        this.success = statusCode >= 200 && statusCode < 300;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}

/** 페이지네이션 응답 본문 */
export class PageDto<T> {
    constructor(
        readonly items: T[],
        readonly page: number,
        readonly size: number,
        readonly totalElements: number,
        readonly totalPages: number,
    ) {}

    static of<T>(items: T[], page: number, size: number, total: number): PageDto<T> {
        return new PageDto(items, page, size, total, Math.ceil(total / size));
    }
}
