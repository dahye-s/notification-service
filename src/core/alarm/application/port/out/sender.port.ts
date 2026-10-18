import { MessageRecord, SendRequest, SendResult } from './type/sender.type';

export const SENDER_PORT = Symbol('SenderPort');

export interface SenderPort {
    /** 발송. HTTP 응답을 SendResult로 분류해서 돌려줌. */
    send(request: SendRequest): Promise<SendResult>;

    /** ClientRef로 발송 내역 조회 - 타임아웃 건의 실제 발송 여부 확인 */
    findByClientRef(clientRef: string): Promise<MessageRecord[]>;
}
