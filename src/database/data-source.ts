import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Game } from '../game/entities/game.entity';
import { User } from '../users/entities/user.entity';
import { Invitation } from '../invitations/entities/invitation.entity';
import { Card } from '../game/entities/card.entity';
import { Move } from 'src/game/entities/move.entity';
import { LobbyPlayer } from 'src/invitations/entities/lobby-player.entity';

// Загружаем переменные окружения из файла .env
config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get<string>('POSTGRES_HOST', 'postgres'),
  port: configService.get<number>('POSTGRES_PORT', 5432),
  username: configService.get<string>('POSTGRES_USER', 'postgres'),
  password: configService.get<string>('POSTGRES_PASSWORD', 'root'),
  database: configService.get<string>('POSTGRES_DB', 'postgres'),
  entities: [Game, User, Invitation, Card, Move, LobbyPlayer],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  migrationsRun: false,
});
