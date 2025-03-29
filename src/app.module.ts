import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InvitationsModule } from './invitations/invitations.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // Загружаем .env
    DatabaseModule,
    GameModule,
    AuthModule,
    UsersModule,
    InvitationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
