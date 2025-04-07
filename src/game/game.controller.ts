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
import { CreateGameDto } from './dto/create-game.dto';
import { MakeMoveDto } from './dto/make-move.dto';
import { SelectCardsDto } from './dto/select-cards.dto';
import { SelectedPlayArea, WizardPropertyToken } from './types';
import { Card } from './entities/card.entity';

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

  @Get(':gameId/selection-options/:playerId')
  async getSelectionOptions(
    @Param('gameId') gameId: string,
    @Param('playerId') playerId: string,
  ): Promise<{
    properties: WizardPropertyToken[];
    familiars: Card[];
    playerAreas: SelectedPlayArea[];
  }> {
    return this.gameService.getSelectionOptions(gameId, playerId);
  }

  // @Post(':gameId/select-cards/:playerId')
  // @UseGuards(AuthGuard('jwt'))
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Выбрать стартовые карты' })
  // @ApiResponse({ status: 200, description: 'Карты выбраны', type: Object })
  // async selectCards(
  //   @Param('gameId') gameId: string,
  //   @Param('playerId') playerId: string,
  //   @Body()
  //   selectedCards: {
  //     property: WizardPropertyToken;
  //     familiar: Card;
  //     playerArea: SelectedPlayArea;
  //   },
  // ): Promise<Game> {
  //   return this.gameService.selectCards(gameId, playerId, selectedCards);
  // }

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
      return this.gameService.playCard(
        gameId.toString(),
        move.cardId,
        move.targetId,
      );
    } else if (move.type === 'end-turn') {
      return this.gameService.endTurn(gameId.toString());
    }
    // else if (move.type === 'attack') {
    //   if (!move.targetId) {
    //     throw new Error('Не указан игрок для атаки');
    //   }
    //   if (!move.damage) {
    //     throw new Error('Не указан урон');
    //   }
    //   return this.gameService.attackPlayer(
    //     gameId.toString(),
    //     move.targetId,
    //     move.damage,
    //   );
    // }
    else if (move.type === 'buy-card') {
      if (!move.cardId) {
        throw new Error('Не указан id карты для покупки');
      }
      if (move.isLegendary === null || move.isLegendary === undefined) {
        throw new Error(
          `Не указан флаг легендарности карты. move.isLegendary = ${move.isLegendary}`,
        );
      }
      return this.gameService.buyCard(
        gameId.toString(),
        move.cardId,
        move.isLegendary,
      );
    }
    throw new Error('Неверный тип хода');
  }

  @Post(':gameId/destroyCard')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async destroyCard(
    @Param('gameId') gameId: string,
    @Body() body: { playerId: string; cardId: number },
  ) {
    return this.gameService.destroyCardFromDiscard(
      gameId,
      body.playerId,
      body.cardId,
    );
  }

  @Post(':gameId/topDeckSelection')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async topDeckSelection(
    @Param('gameId') gameId: string,
    @Body() body: { playerId: string; action: string; cardId: number },
  ) {
    return this.gameService.handleTopDeckSelection(
      gameId,
      body.playerId,
      body.action,
      body.cardId,
    );
  }

  @Post(':gameId/cancelAttackTargetSelection')
  async cancelAttackTargetSelection(
    @Param('gameId') gameId: string,
    @Body() body: { playerId: string },
  ) {
    return this.gameService.cancelAttackTargetSelection(gameId, body.playerId);
  }

  @Post(':gameId/resolveAttackTarget')
  async resolveAttackTarget(
    @Param('gameId') gameId: string,
    @Body() body: { playerId: string; opponentId: number },
  ) {
    return this.gameService.resolveAttackTarget(
      gameId,
      body.playerId,
      body.opponentId,
    );
  }

  @Post(':gameId/resolve-defense')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async resolveDefense(
    @Param('gameId') gameId: string,
    @Body() body: { opponentId: string; defenseCardId?: number },
  ) {
    return this.gameService.resolveDefense(
      gameId,
      body.opponentId,
      body.defenseCardId || null,
    );
  }
}
