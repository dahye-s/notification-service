/**
 * 초당 허용량을 슬라이딩 윈도우 카운터로 센다.
 *
 * KEYS[1] 윈도우 키 prefix
 * KEYS[2] 429 전역 게이트 키
 * ARGV[1] 초당 허용 건수
 *
 * 반환 [허가여부, 대기시간ms]
 *
 * - INCR과 PEXPIRE를 나누면 INCR 직후 프로세스가 죽었을 때 TTL 없는 키가 남아
 *   해당 초가 영구히 차단되므로 Lua로 원자화한다.
 * - 윈도우 기준을 redis.call('TIME')으로 잡아 워커 간 시계 편차를 제거한다.
 */
export const ACQUIRE_TOKEN_SCRIPT = `
local gate = redis.call('PTTL', KEYS[2])
if gate > 0 then return {0, gate} end

local t = redis.call('TIME')
local sec = tonumber(t[1])
local ratio = tonumber(t[2]) / 1000000

local curKey = KEYS[1] .. ':' .. sec
local prev = tonumber(redis.call('GET', KEYS[1] .. ':' .. (sec - 1)) or '0')
local cur = tonumber(redis.call('GET', curKey) or '0')

-- 고정 윈도우는 0.9초와 1.1초에 각각 한도만큼 나가면
-- 실제 1초 구간에 2배가 몰린다. 직전 창의 잔여분을 가중 합산해 막는다
if prev * (1 - ratio) + cur >= tonumber(ARGV[1]) then
    -- 한도에 근접하면 거부가 잦아지므로 재시도 간격이 그대로 처리량 손실이 된다
    return {0, 20}
end

local count = redis.call('INCR', curKey)
if count == 1 then redis.call('PEXPIRE', curKey, 2000) end
return {1, 0}
`;
