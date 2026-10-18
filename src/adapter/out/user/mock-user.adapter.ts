import type { UserPort } from '@core/alarm/application/port/out/user.port';
import type { UserPage } from '@core/alarm/application/port/out/type/user.type';
import { Injectable } from '@nestjs/common';
import axios, { type AxiosInstance } from 'axios';

@Injectable()
export class MockUserAdapter implements UserPort {
    private readonly http: AxiosInstance;

    constructor() {
        this.http = axios.create({
            baseURL: process.env.MOCK_API_URL ?? 'http://localhost:4000',
            timeout: Number(process.env.LOOKUP_TIMEOUT_MS ?? 5000),
        });
    }

    /** nextCursor가 null이 될 때까지 워커가 반복 호출한다 */
    async fetchPage(cursor: string | null, limit: number): Promise<UserPage> {
        const res = await this.http.get<UserPage>('/v1/users', {
            params: { limit, ...(cursor && { cursor }) },
        });

        return res.data;
    }
}
