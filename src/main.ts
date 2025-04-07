import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Подключаем cookie-parser
  app.use(cookieParser());
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/images' });

  app.enableCors({
    origin: 'http://localhost:8080', // Указываем конкретный origin фронтенда
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Разрешённые методы
    allowedHeaders: ['Content-Type', 'Authorization'], // Разрешаем заголовок Authorization
    credentials: true, // Если используете куки или авторизацию с credentials
  });

  // Настройка Swagger
  const config = new DocumentBuilder()
    .setTitle('Крутогедон API')
    .setDescription('API для карточной игры "Крутогедон"')
    .setVersion('1.0')
    .addBearerAuth() // Добавляем поддержку Bearer-токена для аутентификации
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger UI будет доступен по /api

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
