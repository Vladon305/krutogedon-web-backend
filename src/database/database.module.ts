import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Game } from '../game/entities/game.entity';
import { User } from '../users/entities/user.entity';
import { Invitation } from '../invitations/entities/invitation.entity';
import { Card } from '../game/entities/card.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get<string>('POSTGRES_HOST', 'postgres'),
          port: configService.get<number>('POSTGRES_PORT', 5432),
          username: configService.get<string>('POSTGRES_USER', 'postgres'),
          password: configService.get<string>('POSTGRES_PASSWORD', 'root'),
          database: configService.get<string>('POSTGRES_DB', 'postgres'),
          autoLoadEntities: true,
          entities: [Game, User, Invitation, Card], // Добавлено!
          synchronize: false, // Отключи на проде!
          migrations: [__dirname + '/../migrations/*.js'], // Указываем путь к миграциям
          migrationsRun: false, // Не запускаем миграции автоматически
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
