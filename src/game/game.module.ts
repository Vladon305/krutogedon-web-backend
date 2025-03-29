import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { UsersModule } from 'src/users/users.module';
import { InvitationsModule } from 'src/invitations/invitations.module';
import { Move } from './entities/move.entity';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Game, Move, Invitation]),
    UsersModule,
    InvitationsModule,
  ],
  controllers: [GameController],
  providers: [GameService, GameGateway],
})
export class GameModule {}
