import { AllExceptionsFilter } from '@global/filter/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    const config = new DocumentBuilder()
        .setTitle('알림 발송 API')
        .setDescription('알림 생성·조회·발송·취소를 제공한다')
        .setVersion('1.0')
        .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
