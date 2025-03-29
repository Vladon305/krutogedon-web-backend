import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { Invitation } from './entities/invitation.entity';
import { LobbyPlayer } from './entities/lobby-player.entity';
import { UsersModule } from '../users/users.module';
import { GameGateway } from '../game/game.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, LobbyPlayer]), UsersModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, GameGateway],
  exports: [InvitationsService],
})
export class InvitationsModule {}
