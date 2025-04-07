import { forwardRef, Module } from '@nestjs/common';
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
import { Card } from './entities/card.entity';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { CardService } from './card.service';
import { GameStateService } from './game-state.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Game, Move, Invitation, Card]),
    UsersModule,
    forwardRef(() => InvitationsModule),
  ],
  controllers: [GameController],
  providers: [
    GameService,
    GameGateway,
    PlayerService,
    TurnService,
    CardService,
    GameStateService,
  ],
  exports: [GameService],
})
export class GameModule {}
