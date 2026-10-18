/**
 * repo.query() 결과에서 행 배열만 꺼낸다.
 * postgres 드라이버는 UPDATE/INSERT/DELETE의 RETURNING을 [rows, rowCount]로 돌려주고
 * SELECT는 rows만 돌려주므로 호출부에서 형태가 달라진다.
 */
export function toRows<T>(result: unknown): T[] {
    if (!Array.isArray(result)) return [];
    return (Array.isArray(result[0]) ? result[0] : result) as T[];
}
