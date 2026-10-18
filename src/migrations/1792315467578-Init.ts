import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1792315467578 implements MigrationInterface {
    name = 'Init1792315467578';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."alarms_type_enum" AS ENUM('NORMAL', 'URGENT')`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."alarms_status_enum" AS ENUM('CREATED', 'PREPARING', 'SENDING', 'COMPLETED', 'CANCELLED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "alarms" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" "public"."alarms_type_enum" NOT NULL DEFAULT 'NORMAL', "status" "public"."alarms_status_enum" NOT NULL DEFAULT 'CREATED', "title" character varying(200) NOT NULL, "body" text NOT NULL, "total_count" integer NOT NULL DEFAULT '0', "sent_count" integer NOT NULL DEFAULT '0', "failed_count" integer NOT NULL DEFAULT '0', "unknown_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "started_at" TIMESTAMP WITH TIME ZONE, "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b776da486fb19d38b4f7777a6da" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_alarms_list" ON "alarms" ("status", "created_at" DESC)`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."alarm_deliveries_status_enum" AS ENUM('PENDING', 'IN_FLIGHT', 'SENT', 'FAILED', 'UNKNOWN', 'CANCELLED')`,
        );
        await queryRunner.query(
            `CREATE TABLE "alarm_deliveries" ("id" BIGSERIAL NOT NULL, "alarm_id" uuid NOT NULL, "recipient_id" character varying(64) NOT NULL, "status" "public"."alarm_deliveries_status_enum" NOT NULL DEFAULT 'PENDING', "priority" smallint NOT NULL DEFAULT '1', "attempts" smallint NOT NULL DEFAULT '0', "recovery_count" smallint NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "locked_by" character varying(64), "lease_token" uuid, "client_ref" character varying(128) NOT NULL, "message_id" character varying(64), "last_error" character varying(500), "sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_alarm_recipient" UNIQUE ("alarm_id", "recipient_id"), CONSTRAINT "PK_25dc9a9e6a821cd6fd2d046a4a7" PRIMARY KEY ("id"))`,
        );

        // ── 아래부터 수동 추가 ──────────────────────────────

        // 알림 삭제 시 발송 건도 함께 정리
        await queryRunner.query(
            `ALTER TABLE "alarm_deliveries" ADD CONSTRAINT "fk_deliveries_alarm" FOREIGN KEY ("alarm_id") REFERENCES "alarms"("id") ON DELETE CASCADE`,
        );

        // 워커 클레임 전용 인덱스.
        // 발송 완료 후 대부분의 행이 SENT가 되므로, 처리 대상만 담는 부분 인덱스로 둔다.
        await queryRunner.query(
            `CREATE INDEX "idx_deliveries_claim" ON "alarm_deliveries" ("status", "priority", "next_attempt_at") WHERE "status" IN ('PENDING', 'IN_FLIGHT')`,
        );

        // 알림별 진행률 집계
        await queryRunner.query(
            `CREATE INDEX "idx_deliveries_stats" ON "alarm_deliveries" ("alarm_id", "status")`,
        );

        // 타임아웃 복구 시 clientRef로 역조회
        await queryRunner.query(
            `CREATE INDEX "idx_deliveries_client_ref" ON "alarm_deliveries" ("client_ref")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_deliveries_client_ref"`);
        await queryRunner.query(`DROP INDEX "public"."idx_deliveries_stats"`);
        await queryRunner.query(`DROP INDEX "public"."idx_deliveries_claim"`);
        await queryRunner.query(
            `ALTER TABLE "alarm_deliveries" DROP CONSTRAINT "fk_deliveries_alarm"`,
        );
        await queryRunner.query(`DROP TABLE "alarm_deliveries"`);
        await queryRunner.query(`DROP TYPE "public"."alarm_deliveries_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_alarms_list"`);
        await queryRunner.query(`DROP TABLE "alarms"`);
        await queryRunner.query(`DROP TYPE "public"."alarms_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."alarms_type_enum"`);
    }
}
