/** 통계 컬럼 증가분. 동시 갱신을 위해 절대값이 아닌 증가분을 넘긴다 */
export interface StatsDelta {
    sent?: number;
    failed?: number;
    unknown?: number;
}
