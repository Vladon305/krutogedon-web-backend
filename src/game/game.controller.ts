import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { Game } from './entities/game.entity';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

class CreateGameDto {
  invitationId: number;
}

class MakeMoveDto {
  gameId: number;
  move: {
    type: 'play-card' | 'end-turn' | 'attack' | 'buy-card';
    cardId?: number;
    targetId?: string;
    damage?: number;
    marketplaceIndex?: number;
    isLegendary?: boolean;
  };
}

class SelectCardsDto {
  playerId: string;
  selectedCards: { property: any; familiar: any; playerArea: any };
}

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новую игру' })
  @ApiResponse({ status: 201, description: 'Игра создана', type: Object })
  async createGame(@Body() createGameDto: CreateGameDto): Promise<Game> {
    return this.gameService.createGame(createGameDto.invitationId);
  }

  @Get('lobby/:invitationId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить информацию о лобби' })
  @ApiResponse({ status: 200, description: 'Информация о лобби', type: Object })
  async getLobby(@Param('invitationId') invitationId: string): Promise<any> {
    return this.gameService.getLobby(+invitationId);
  }

  @Get(':gameId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить состояние игры' })
  @ApiResponse({ status: 200, description: 'Состояние игры', type: Object })
  async getGame(@Param('gameId') gameId: string): Promise<Game> {
    return this.gameService.getGame(gameId);
  }

  @Post(':gameId/select-cards')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выбрать стартовые карты' })
  @ApiResponse({ status: 200, description: 'Карты выбраны', type: Object })
  async selectCards(
    @Param('gameId') gameId: string,
    @Body() selectCardsDto: SelectCardsDto,
  ): Promise<Game> {
    return this.gameService.selectCards(
      gameId,
      selectCardsDto.playerId,
      selectCardsDto.selectedCards,
    );
  }

  @Post('move')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Совершить ход' })
  @ApiResponse({ status: 200, description: 'Ход совершён', type: Object })
  async makeMove(@Body() makeMoveDto: MakeMoveDto): Promise<Game> {
    const { gameId, move } = makeMoveDto;
    if (move.type === 'play-card') {
      if (!move.cardId) {
        throw new Error('Не указана карта для игры');
      }
      return this.gameService.playCard(gameId.toString(), move.cardId);
    } else if (move.type === 'end-turn') {
      return this.gameService.endTurn(gameId.toString());
    } else if (move.type === 'attack') {
      if (!move.targetId) {
        throw new Error('Не указан игрок для атаки');
      }
      if (!move.damage) {
        throw new Error('Не указан урон');
      }
      return this.gameService.attackPlayer(
        gameId.toString(),
        move.targetId,
        move.damage,
      );
    } else if (move.type === 'buy-card') {
      if (!move.marketplaceIndex) {
        throw new Error('Не указан индекс карты для покупки');
      }
      if (!move.isLegendary) {
        throw new Error('Не указан флаг легендарности карты');
      }
      return this.gameService.buyCard(
        gameId.toString(),
        move.marketplaceIndex,
        move.isLegendary,
      );
    }
    throw new Error('Неверный тип хода');
  }
}
