import type { SenderPort } from '@core/alarm/application/port/out/sender.port';
import type {
    MessageRecord,
    SendRequest,
    SendResult,
} from '@core/alarm/application/port/out/type/sender.type';
import { Injectable, Logger } from '@nestjs/common';
import axios, { isAxiosError, type AxiosInstance } from 'axios';
import { classifySendResponse } from './send-result.classifier';

@Injectable()
export class MockSenderAdapter implements SenderPort {
    private readonly logger = new Logger(MockSenderAdapter.name);
    private readonly http: AxiosInstance;
    private readonly lookupTimeout: number;

    constructor() {
        this.http = axios.create({
            baseURL: process.env.MOCK_API_URL ?? 'http://localhost:4000',
            timeout: Number(process.env.SEND_TIMEOUT_MS ?? 5000),
        });
        this.lookupTimeout = Number(process.env.LOOKUP_TIMEOUT_MS ?? 5000);
    }

    async send(request: SendRequest): Promise<SendResult> {
        try {
            const res = await this.http.post<{ messageId: string }>('/v1/messages', request);

            return classifySendResponse(res.status, undefined, res.data.messageId, '', false);
        } catch (e) {
            if (!isAxiosError(e)) {
                return classifySendResponse(undefined, undefined, undefined, String(e), true);
            }

            // 응답 자체를 못 받았으면 발송 여부를 알 수 없다
            const isTimeout = e.code === 'ECONNABORTED' || !e.response;

            return classifySendResponse(
                e.response?.status,
                e.response?.headers['retry-after'] as string | undefined,
                undefined,
                (e.response?.data as { message?: string })?.message ?? e.message,
                isTimeout,
            );
        }
    }

    /** 이 조회에는 처리량 제한이 없어 복구 비용이 발송 예산을 쓰지 않는다 */
    async findByClientRef(clientRef: string): Promise<MessageRecord[]> {
        const res = await this.http.get<{ messages: MessageRecord[] }>('/v1/messages', {
            params: { clientRef },
            timeout: this.lookupTimeout,
        });

        return res.data.messages ?? [];
    }
}
