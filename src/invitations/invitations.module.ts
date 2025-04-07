import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Invitation } from './entities/invitation.entity';
import { LobbyPlayer } from './entities/lobby-player.entity';
import { UsersModule } from '../users/users.module';
import { GameGateway } from '../game/game.gateway';
import { GameModule } from 'src/game/game.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, LobbyPlayer]),
    UsersModule,
    forwardRef(() => GameModule),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, GameGateway],
  exports: [InvitationsService],
})
export class InvitationsModule {}
