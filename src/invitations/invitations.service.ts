import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';
import { Invitation } from './entities/invitation.entity';
import { LobbyPlayer } from './entities/lobby-player.entity';
import { GameGateway } from '../game/game.gateway';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationsRepository: Repository<Invitation>,
    @InjectRepository(LobbyPlayer)
    private lobbyPlayerRepository: Repository<LobbyPlayer>,
    private usersService: UsersService,
    private gameGateway: GameGateway,
  ) {}

  async create(senderId: number): Promise<any> {
    const sender = await this.usersService.findOneById(senderId);
    if (!sender) {
      throw new BadRequestException('Отправитель не найден');
    }

    const invitation = this.invitationsRepository.create({
      sender,
      receivers: [],
      status: 'pending',
      token: uuidv4(),
    });

    const savedInvitation = await this.invitationsRepository.save(invitation);

    const existingLobbyPlayer = await this.lobbyPlayerRepository.findOne({
      where: { user: { id: senderId }, invitation: { id: savedInvitation.id } },
    });

    if (!existingLobbyPlayer) {
      const lobbyPlayer = this.lobbyPlayerRepository.create({
        user: sender,
        invitation: savedInvitation,
        ready: false,
      });
      await this.lobbyPlayerRepository.save(lobbyPlayer);
      console.log(
        `Added sender ${senderId} to lobbyPlayers for invitation ${savedInvitation.id}`,
      );
    } else {
      console.log(
        `Sender ${senderId} already in lobbyPlayers for invitation ${savedInvitation.id}`,
      );
    }

    const lobbyLink = `http://localhost:8080/lobby/${savedInvitation.id}?token=${savedInvitation.token}`;

    return {
      ...savedInvitation,
      lobbyLink,
    };
  }

  async joinLobbyByToken(token: string, userId: number): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { token },
      relations: ['sender', 'receivers', 'lobbyPlayers', 'lobbyPlayers.user'],
    });

    if (!invitation) {
      throw new BadRequestException('Приглашение не найдено');
    }

    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new BadRequestException('Пользователь не найден');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        'Приглашение уже использовано или игра началась',
      );
    }

    const currentPlayersCount = invitation.lobbyPlayers.length;
    const MAX_PLAYERS = 5;
    if (currentPlayersCount >= MAX_PLAYERS) {
      throw new BadRequestException('Лобби уже заполнено (максимум 5 игроков)');
    }

    const existingLobbyPlayer = await this.lobbyPlayerRepository.findOne({
      where: { user: { id: userId }, invitation: { id: invitation.id } },
    });

    if (!existingLobbyPlayer) {
      const lobbyPlayer = this.lobbyPlayerRepository.create({
        user,
        invitation,
        ready: false,
      });
      try {
        await this.lobbyPlayerRepository.save(lobbyPlayer);
        console.log(
          `Added user ${userId} to lobbyPlayers for invitation ${invitation.id}`,
        );
      } catch (error) {
        console.error(
          `Failed to add user ${userId} to lobbyPlayers:`,
          error.message,
        );
      }
    } else {
      console.log(
        `User ${userId} already in lobbyPlayers for invitation ${invitation.id}`,
      );
    }

    const updatedInvitation = await this.invitationsRepository.findOne({
      where: { id: invitation.id },
      relations: ['sender', 'receivers', 'lobbyPlayers', 'lobbyPlayers.user'],
    });

    if (!updatedInvitation) {
      throw new BadRequestException('Приглашение не найдено после обновления');
    }

    updatedInvitation.receivers = updatedInvitation.receivers || [];
    if (
      !updatedInvitation.receivers.some((receiver) => receiver.id === userId)
    ) {
      updatedInvitation.receivers.push(user);
    }

    await this.invitationsRepository.save(updatedInvitation);

    const lobbyData = await this.getLobby(updatedInvitation.id);
    console.log(
      `Sending lobbyUpdate for invitation ${updatedInvitation.id}:`,
      lobbyData,
    );
    console.log(`Emitting to room: lobby-${updatedInvitation.id}`);
    this.gameGateway.server
      .to(`lobby-${updatedInvitation.id}`)
      .emit('lobbyUpdate', lobbyData);

    return updatedInvitation;
  }

  async setReady(invitationId: number, userId: number): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId },
      relations: ['sender', 'receivers', 'lobbyPlayers', 'lobbyPlayers.user'],
    });

    if (!invitation) {
      throw new BadRequestException('Приглашение не найдено');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Приглашение уже обработано');
    }

    const lobbyPlayer = invitation.lobbyPlayers.find(
      (lp) => lp.user.id === userId,
    );
    if (!lobbyPlayer) {
      throw new BadRequestException('Вы не являетесь участником этого лобби');
    }

    if (lobbyPlayer.ready) {
      throw new BadRequestException('Вы уже готовы');
    }

    lobbyPlayer.ready = true;
    await this.lobbyPlayerRepository.save(lobbyPlayer);

    const lobbyData = await this.getLobby(invitationId);
    const allPlayersReady = lobbyData.players.every(
      (player: any) => player.ready,
    );
    const playerCount = lobbyData.players.length;
    const MIN_PLAYERS = 2;

    // Проверяем, что в лобби минимум 2 игрока и все готовы
    if (playerCount >= MIN_PLAYERS && allPlayersReady) {
      const gameId = await this.createGame(invitationId);
      invitation.status = 'accepted';
      invitation.gameId = gameId;
      await this.invitationsRepository.save(invitation);

      this.gameGateway.server
        .to(`lobby-${invitationId}`)
        .emit('gameStarted', { gameId });
    } else if (playerCount < MIN_PLAYERS) {
      console.log(
        `Cannot start game: only ${playerCount} player(s) in lobby, minimum ${MIN_PLAYERS} required`,
      );
    }

    this.gameGateway.server
      .to(`lobby-${invitationId}`)
      .emit('lobbyUpdate', lobbyData);
  }

  async getLobby(invitationId: number): Promise<any> {
    if (!invitationId) {
      throw new BadRequestException('invitationId не найдено');
    }

    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId },
      relations: ['sender', 'receivers', 'lobbyPlayers', 'lobbyPlayers.user'],
    });
    if (!invitation) {
      throw new BadRequestException('Приглашение не найдено');
    }

    const players = invitation.lobbyPlayers.map((lp) => ({
      id: lp.user.id,
      username: lp.user.username,
      ready: lp.ready,
    }));

    const uniquePlayers = Array.from(
      new Map(players.map((player) => [player.id, player])).values(),
    );

    return {
      invitation: {
        id: invitation.id,
        inviterId: invitation.sender.id,
        status: invitation.status,
        gameId: invitation.gameId,
      },
      players: uniquePlayers,
    };
  }

  async findOne(id: number): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id },
      relations: ['sender', 'receivers', 'lobbyPlayers', 'lobbyPlayers.user'],
    });

    if (!invitation) {
      throw new BadRequestException('Приглашение не найдено');
    }

    return invitation;
  }

  private async createGame(invitationId: number): Promise<number> {
    return invitationId; // Заглушка
  }
}
