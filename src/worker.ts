import { DispatchWorker } from '@adapter/in/worker/dispatch.worker';
import { WorkerModule } from '@global/module/worker.module';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * 워커 엔트리포인트.
 * HTTP 서버 없이 DI 컨테이너만 올린다.
 */
async function bootstrap() {
    const logger = new Logger('Worker');
    const app = await NestFactory.createApplicationContext(WorkerModule);
    const worker = app.get(DispatchWorker);

    // SIGTERM을 받으면 새 클레임을 멈추고 진행 중인 발송만 마무리한다.
    // 못 끝낸 건은 lease가 만료되면 다른 워커가 이어받는다
    const shutdown = async (signal: string) => {
        logger.log(`${signal} received`);
        await worker.shutdown();
        await app.close();
        process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    await worker.run();
}

void bootstrap();
