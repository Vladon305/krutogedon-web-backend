import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameState } from './types';

@WebSocketGateway({
  cors: { origin: 'http://localhost:8080', credentials: true },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(client: Socket, lobbyId: string): void {
    console.log(`Client ${client.id} joining lobby-${lobbyId}`);
    client.join(`lobby-${lobbyId}`);
    client.emit('joinedLobby', `Successfully joined lobby-${lobbyId}`);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(client: Socket, gameId: string): void {
    console.log(`Client ${client.id} joining game-${gameId}`);
    client.join(`game-${gameId}`);
    client.emit('joinedGame', `Successfully joined game-${gameId}`);
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
    console.log(`Emitting game update for game ${gameId}`);
    this.server.to(gameId).emit('gameUpdate', gameState);
    this.server.to(gameId).emit('moveMade', gameState);
  }
}
