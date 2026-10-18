export const TRANSACTION_PORT = Symbol('TransactionPort');

/**
 * 트랜잭션 경계를 코어에서 선언하기 위한 포트.
 * 코어가 ORM에 의존하지 않도록 실행만 위임한다.
 */
export interface TransactionPort {
    run<T>(work: () => Promise<T>): Promise<T>;
}
