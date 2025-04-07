import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameState, SelectedPlayArea, WizardPropertyToken } from './types';
import { Card } from './entities/card.entity';

@WebSocketGateway({
  cors: { origin: 'http://localhost:8080', credentials: true },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map для хранения соответствия playerId -> socket.id
  private playerSocketMap: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Удаляем клиента из playerSocketMap при отключении
    for (const [playerId, socketId] of this.playerSocketMap.entries()) {
      if (socketId === client.id) {
        this.playerSocketMap.delete(playerId);
        break;
      }
    }
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(client: Socket, payload: { lobbyId: string }): void {
    console.log('lobbyId', payload.lobbyId);
    console.log(`Client ${client.id} joining lobby-${payload.lobbyId}`);
    client.join(`lobby-${payload.lobbyId}`);
    client.emit('joinedLobby', `Successfully joined lobby-${payload.lobbyId}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    client: Socket,
    payload: { gameId: string; playerId: string },
  ): void {
    console.log(
      `Client ${client.id} joining game-${payload.gameId} as player ${payload.playerId}`,
    );
    client.join(payload.gameId);
    // Сохраняем соответствие playerId -> socket.id
    this.playerSocketMap.set(payload.playerId, client.id);
    client.emit('joinedGame', `Successfully joined game ${payload.gameId}`);
  }

  @SubscribeMessage('makeMove')
  handleMakeMove(
    client: Socket,
    payload: { gameId: number; userId: string; move: any },
  ): void {
    console.log(
      `Move made by user ${payload.userId} in game ${payload.gameId}:`,
      payload.move,
    );
    this.server.to(`game-${payload.gameId}`).emit('moveMade', payload);
  }

  emitGameUpdate(gameId: string, gameState: GameState) {
    const clients = this.server.sockets.adapter.rooms.get(gameId)?.size || 0;
    console.log(
      `Emitting game update for game ${gameId}, clients in room: ${clients}`,
    );
    this.server.to(gameId).emit('gameUpdate', gameState);
    this.server.to(gameId).emit('moveMade', gameState);
  }

  emitLegendaryCardRevealed(gameId: string, card: Card) {
    const clients = this.server.sockets.adapter.rooms.get(gameId)?.size || 0;
    console.log(
      `Emitting legendary card revealed for game ${gameId}, card: ${card.name}, clients in room: ${clients}`,
    );
    this.server.to(gameId).emit('legendaryCardRevealed', card);
  }

  emitSelectionRequired(gameId: number, playerId: string, data: any) {
    const socketId = this.playerSocketMap.get(playerId);
    if (socketId) {
      this.server.to(socketId).emit('selectionRequired', { playerId, data });
      console.log(
        `Emitted selectionRequired to player ${playerId} (socket ${socketId})`,
      );
    } else {
      console.error(`No socket found for player ${playerId}`);
    }
  }

  emitAttackRequired(gameId: number, playerId: string, data: any) {
    const socketId = this.playerSocketMap.get(playerId);
    if (socketId) {
      this.server.to(socketId).emit('attackRequired', { playerId, data });
      console.log(
        `Emitted attackRequired to player ${playerId} (socket ${socketId})`,
      );
    } else {
      console.error(`No socket found for player ${playerId}`);
    }
  }

  emitAttackTargetRequired(gameId: string, playerId: string, data: any) {
    const socketId = this.playerSocketMap.get(playerId);
    if (socketId) {
      this.server.to(socketId).emit('attackTargetRequired', { playerId, data });
      console.log(
        `Emitted attackTargetRequired to player ${playerId} (socket ${socketId})`,
      );
    } else {
      console.error(`No socket found for player ${playerId}`);
    }
  }

  emitAttackTargetNotification(
    gameId: string,
    playerId: string,
    cardId: number,
  ) {
    this.server
      .to(gameId)
      .emit('attackTargetNotification', { playerId, cardId });
    console.log(
      `Emitted attackTargetNotification to game ${gameId} for player ${playerId} with card ${cardId}`,
    );
  }

  emitSelectionUpdated(
    gameId: string,
    playerId: string,
    selection: {
      property: WizardPropertyToken;
      familiar: Card;
      playerArea: SelectedPlayArea;
    },
  ) {
    this.server.to(gameId).emit('selectionUpdated', { playerId, selection });
  }

  emitDefenseRequired(
    gameId: string,
    opponentId: string,
    attackData: {
      attackerId: number;
      opponentId: number;
      cardId: number;
      damage: number;
    },
  ) {
    const socketId = this.playerSocketMap.get(opponentId);
    if (socketId) {
      this.server.to(socketId).emit('defenseRequired', { gameId, attackData });
      console.log(
        `Emitted defenseRequired to player ${opponentId} (socket ${socketId})`,
      );
    } else {
      console.error(`No socket found for player ${opponentId}`);
    }
  }

  emitAttackNotification(
    gameId: string,
    attackerId: string,
    opponentId: string,
    cardId: number,
    damage: number,
  ) {
    this.server
      .to(gameId)
      .emit('attackNotification', { attackerId, opponentId, cardId, damage });
  }

  // Раскрытие верхней карты колоды врагов
  emitTopDeckReveal(
    gameId: string,
    playerId: string,
    revealedCards: { enemyId: number; card: Card }[],
  ) {
    this.server.to(gameId).emit('topDeckReveal', { playerId, revealedCards });
    console.log(
      `Emitted topDeckReveal to game ${gameId} for player ${playerId}`,
    );
  }

  // Раскрытие верхней карты одного врага
  emitTopCardRevealed(gameId: string, opponentId: string, card: Card) {
    this.server.to(gameId).emit('topCardRevealed', { opponentId, card });
    console.log(
      `Emitted topCardRevealed to game ${gameId} for opponent ${opponentId}`,
    );
  }

  // Раскрытие руки врага
  emitHandRevealed(gameId: string, opponentId: string, hand: Card[]) {
    this.server.to(gameId).emit('handRevealed', { opponentId, hand });
    console.log(
      `Emitted handRevealed to game ${gameId} for opponent ${opponentId}`,
    );
  }

  // Запрос на уничтожение карты из руки
  emitDestroyCardRequired(gameId: string, playerId: string, cardIds: number[]) {
    this.server.to(gameId).emit('destroyCardRequired', { playerId, cardIds });
    console.log(
      `Emitted destroyCardRequired to game ${gameId} for player ${playerId}`,
    );
  }

  // Запрос на выбор врага (например, для передачи мёртвого волшебника)
  emitSelectEnemyRequired(
    gameId: string,
    playerId: string,
    targets: number[],
    action: string,
  ) {
    this.server
      .to(gameId)
      .emit('selectEnemyRequired', { playerId, targets, action });
    console.log(
      `Emitted selectEnemyRequired to game ${gameId} for player ${playerId}`,
    );
  }
}
