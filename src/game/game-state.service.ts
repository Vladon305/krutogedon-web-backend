import { Injectable } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Move } from './entities/move.entity';
import { Game } from './entities/game.entity';
import { GameState, Player } from './types';
import { InjectRepository } from '@nestjs/typeorm';

// game-state.service.ts
@Injectable()
export class GameStateService {
  constructor(
    private readonly gameGateway: GameGateway,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Move)
    private readonly moveRepository: Repository<Move>,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
  ) {}

  async saveGameState(game: Game, gameState: GameState): Promise<void> {
    game.gameState = gameState;
    await this.gameRepository.save(game);
    this.gameGateway.emitGameUpdate(game.id.toString(), gameState);
  }

  async createMove(game: Game, player: Player, moveData: any): Promise<Move> {
    const user = await this.userRepository.findOne({
      where: { id: +player.userId },
    });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const move = this.moveRepository.create({
      game,
      player: user,
      moveData,
      timestamp: new Date(),
    });

    await this.moveRepository.save(move);
    if (!game.moves) {
      game.moves = [];
    }
    game.moves.push(move);

    return move;
  }

  createGameResponse(game: Game): Game {
    return {
      id: game.id,
      players: game.players,
      gameState: game.gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
      status: game.status,
      winner: game.winner,
      moves: game.moves || [],
      cards: game.cards || [],
    };
  }
}
