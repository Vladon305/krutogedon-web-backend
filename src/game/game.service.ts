import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, GameState, Player } from './types';
import { GameGateway } from './game.gateway';
import { Game } from './entities/game.entity';
import { Move } from './entities/move.entity';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';

@Injectable()
export class GameService {
  private cards: Card[] = [
    {
      id: 1,
      name: 'Злая Паучка',
      cost: 0,
      attack: 0,
      life: 0,
      effect: 'Залить',
      properties: ['Бесспорная'],
      damage: 0,
      isAttack: false,
    },
    {
      id: 2,
      name: 'Место Крутого',
      cost: 7,
      attack: 0,
      life: 0,
      effect: 'Воскресить',
      properties: [],
      damage: 0,
      isAttack: false,
    },
    {
      id: 3,
      name: 'Тёмный Аракон',
      cost: 3,
      attack: 1,
      life: 1,
      effect: 'Кутуз',
      properties: [],
      damage: 2,
      isAttack: true,
    },
    {
      id: 4,
      name: 'Буйная Матя',
      cost: 3,
      attack: 0,
      life: 0,
      effect: 'Двойной отыгрыш',
      properties: [],
      damage: 0,
      isAttack: false,
    },
    {
      id: 5,
      name: 'Война Костей',
      cost: 3,
      attack: 0,
      life: 0,
      effect: 'Война костей',
      properties: [],
      damage: 0,
      isAttack: false,
    },
    {
      id: 6,
      name: 'Легенда Барахолки',
      cost: 9,
      attack: 0,
      life: 0,
      effect: 'Некромантика',
      properties: [],
      damage: 0,
      isAttack: false,
    },
  ];

  private marketplaceCards: Card[] = [
    {
      id: 7,
      name: 'Обычная карта 1',
      cost: 2,
      attack: 1,
      life: 1,
      effect: '',
      properties: [],
      damage: 1,
      isAttack: true,
    },
    {
      id: 8,
      name: 'Обычная карта 2',
      cost: 3,
      attack: 2,
      life: 2,
      effect: '',
      properties: [],
      damage: 2,
      isAttack: true,
    },
    {
      id: 9,
      name: 'Обычная карта 3',
      cost: 4,
      attack: 3,
      life: 3,
      effect: '',
      properties: [],
      damage: 3,
      isAttack: true,
    },
    {
      id: 10,
      name: 'Обычная карта 4',
      cost: 5,
      attack: 4,
      life: 4,
      effect: '',
      properties: [],
      damage: 4,
      isAttack: true,
    },
    {
      id: 11,
      name: 'Обычная карта 5',
      cost: 6,
      attack: 5,
      life: 5,
      effect: '',
      properties: [],
      damage: 5,
      isAttack: true,
    },
  ];

  private legendaryMarketplaceCards: Card[] = [
    {
      id: 12,
      name: 'Легендарная карта 1',
      cost: 8,
      attack: 6,
      life: 6,
      effect: 'Мощный эффект',
      properties: [],
      damage: 6,
      isAttack: true,
    },
    {
      id: 13,
      name: 'Легендарная карта 2',
      cost: 9,
      attack: 7,
      life: 7,
      effect: 'Супер эффект',
      properties: [],
      damage: 7,
      isAttack: true,
    },
    {
      id: 14,
      name: 'Легендарная карта 3',
      cost: 10,
      attack: 8,
      life: 8,
      effect: 'Ультра эффект',
      properties: [],
      damage: 8,
      isAttack: true,
    },
  ];

  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Move)
    private moveRepository: Repository<Move>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private readonly gameGateway: GameGateway,
  ) {}

  private initializeDeck(): Card[] {
    return this.cards.map((card) => ({ ...card }));
  }

  private shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  async createGame(invitationId: number): Promise<Game> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['sender', 'receivers'],
    });

    if (!invitation || invitation.status !== 'accepted') {
      throw new Error('Приглашение не найдено или не принято');
    }

    const player1 = invitation.sender;
    const player2 = invitation.receivers[0];

    if (!player1 || !player2) {
      throw new Error('Один из игроков не найден');
    }

    const gameState: GameState = {
      players: [
        {
          id: 1,
          userId: player1.id.toString(),
          username: player1.username,
          deck: this.shuffleDeck(this.initializeDeck()),
          hand: [],
          discard: [],
          life: 25,
          power: 0,
          krutagidonCups: 0,
          deadWizardTokens: 0,
          playArea: [],
          selectionCompleted: false,
          selectedFamiliar: null,
          selectedProperty: null,
          selectedPlayerArea: null,
        },
        {
          id: 2,
          userId: player2.id.toString(),
          username: player2.username,
          deck: this.shuffleDeck(this.initializeDeck()),
          hand: [],
          discard: [],
          life: 25,
          power: 0,
          krutagidonCups: 0,
          deadWizardTokens: 0,
          playArea: [],
          selectionCompleted: false,
          selectedFamiliar: null,
          selectedProperty: null,
          selectedPlayerArea: null,
        },
      ],
      currentPlayer: 1,
      turn: 1,
      status: 'pending',
      marketplace: this.shuffleDeck([...this.marketplaceCards]).slice(0, 5),
      legendaryMarketplace: this.shuffleDeck([
        ...this.legendaryMarketplaceCards,
      ]).slice(0, 3),
      gameOver: false,
    };

    gameState.players.forEach((player) => {
      player.hand = player.deck.splice(0, 5);
    });

    const game = this.gameRepository.create({
      players: [player1, player2],
      gameState,
      currentTurn: 1,
      currentTurnIndex: 0,
    });

    await this.gameRepository.save(game);

    const gameResponse: Game = {
      id: game.id,
      players: [player1, player2],
      gameState,
      currentTurn: 1,
      currentTurnIndex: 0,
    };

    this.gameGateway.emitGameUpdate(game.id.toString(), gameState);
    return gameResponse;
  }

  async getLobby(invitationId: number): Promise<any> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['sender', 'receivers'],
    });

    if (!invitation) {
      throw new Error('Приглашение не найдено');
    }

    return {
      invitation: {
        id: invitation.id,
        status: invitation.status,
        inviterId: invitation.sender.id,
      },
      players: [invitation.sender, ...invitation.receivers].map((user) => ({
        id: user.id,
        username: user.username,
      })),
    };
  }

  async getGame(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameResponse: Game = {
      id: game.id,
      players: game.players,
      gameState: game.gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
    };

    return gameResponse;
  }

  async selectCards(
    gameId: string,
    playerId: string,
    selectedCards: { property: Card; familiar: Card; playerArea: Card },
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    const player = gameState.players.find((p) => p.userId === playerId);

    if (!player) {
      throw new Error('Игрок не найден');
    }

    player.deck.push(
      selectedCards.property,
      selectedCards.familiar,
      selectedCards.playerArea,
    );
    player.playArea = [selectedCards.playerArea];
    player.selectionCompleted = true;

    if (gameState.players.every((p) => p.selectionCompleted)) {
      gameState.status = 'active';
    }

    game.gameState = gameState;
    await this.gameRepository.save(game);

    const gameResponse: Game = {
      id: game.id,
      players: game.players,
      gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
    };

    this.gameGateway.emitGameUpdate(gameId, gameState);
    return gameResponse;
  }

  async playCard(gameId: string, cardId: number): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    const playerId = gameState.currentPlayer;
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }
    const card = player.hand.find((c) => c.id === cardId);

    if (!card) {
      throw new Error('Карта не найдена в руке');
    }

    this.applyCardEffect(gameState, card, playerId);
    player.hand = player.hand.filter((c) => c.id !== cardId);
    player.discard.push(card);

    this.checkGameEnd(gameState);

    const user = await this.userRepository.findOne({
      where: { id: +player.userId },
    });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    const move = this.moveRepository.create({
      game: game,
      player: user,
      moveData: { cardId, effect: card.effect },
      timestamp: new Date(),
    });
    await this.moveRepository.save(move);

    game.gameState = gameState;
    await this.gameRepository.save(game);

    const gameResponse: Game = {
      id: game.id,
      players: game.players,
      gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
    };

    this.gameGateway.emitGameUpdate(gameId, gameState);
    return gameResponse;
  }

  async attackPlayer(
    gameId: string,
    targetId: string,
    damage: number,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    const target = gameState.players.find((p) => p.id === +targetId);

    if (!target) {
      throw new Error('Цель не найдена');
    }

    target.life -= damage;
    this.checkGameEnd(gameState);

    const player = gameState.players.find(
      (p) => p.id === gameState.currentPlayer,
    );
    if (!player) {
      throw new Error('Игрок не найден');
    }
    const user = await this.userRepository.findOne({
      where: { id: +player.userId },
    });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    const move = this.moveRepository.create({
      game: game,
      player: user,
      moveData: { type: 'attack', targetId, damage },
      timestamp: new Date(),
    });
    await this.moveRepository.save(move);

    game.gameState = gameState;
    await this.gameRepository.save(game);

    const gameResponse: Game = {
      id: game.id,
      players: game.players,
      gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
    };

    this.gameGateway.emitGameUpdate(gameId, gameState);
    return gameResponse;
  }

  async buyCard(
    gameId: string,
    marketplaceIndex: number,
    isLegendary: boolean,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    const player = gameState.players.find(
      (p) => p.id === gameState.currentPlayer,
    );
    if (!player) {
      throw new Error('Игрок не найден');
    }
    const market = isLegendary
      ? gameState.legendaryMarketplace
      : gameState.marketplace;
    const card = market[marketplaceIndex];

    if (!card) {
      throw new Error('Карта не найдена в магазине');
    }

    if (player.power < card.cost) {
      throw new Error('Недостаточно силы для покупки');
    }

    player.power -= card.cost;
    player.deck.push(card);
    market.splice(marketplaceIndex, 1);

    if (isLegendary) {
      gameState.legendaryMarketplace = market;
    } else {
      gameState.marketplace = market;
    }

    const user = await this.userRepository.findOne({
      where: { id: +player.userId },
    });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    const move = this.moveRepository.create({
      game: game,
      player: user,
      moveData: { type: 'buy-card', marketplaceIndex, isLegendary },
      timestamp: new Date(),
    });
    await this.moveRepository.save(move);

    game.gameState = gameState;
    await this.gameRepository.save(game);

    const gameResponse: Game = {
      id: game.id,
      players: game.players,
      gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
    };

    this.gameGateway.emitGameUpdate(gameId, gameState);
    return gameResponse;
  }

  private applyCardEffect(game: GameState, card: Card, playerId: number) {
    const opponentId = playerId === 1 ? 2 : 1;
    const opponent = game.players.find((p) => p.id === opponentId);
    if (!opponent) {
      throw new Error('Противник не найден');
    }

    switch (card.effect) {
      case 'Залить':
        if (!card.properties.includes('Бесспорная')) {
          if (opponent.deck.length > 0) {
            const cardToAdd = opponent.deck.shift();
            if (cardToAdd) {
              opponent.hand.push(cardToAdd);
            }
          }
        }
        break;
      case 'Кутуз':
        const targetCard = opponent.discard.find((c) => c.effect);
        if (targetCard) {
          opponent.discard = opponent.discard.filter(
            (c) => c.id !== targetCard.id,
          );
        }
        break;
      case 'Воскресить':
        const cardToRevive = opponent.discard.shift();
        if (cardToRevive) {
          opponent.deck.push(cardToRevive);
          this.shuffleDeck(opponent.deck);
        }
        break;
      case 'Двойной отыгрыш':
        for (let i = 0; i < 2; i++) {
          if (opponent.deck.length > 0) {
            const cardToAdd = opponent.deck.shift();
            if (cardToAdd) {
              opponent.hand.push(cardToAdd);
            }
          }
        }
        break;
      case 'Война костей':
        opponent.discard = opponent.discard.filter((c) => c.attack === 0);
        break;
      case 'Некромантика':
        const cardsToRevive = opponent.discard.splice(0, 5);
        opponent.deck.push(...cardsToRevive);
        this.shuffleDeck(opponent.deck);
        break;
    }
  }

  async endTurn(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    const currentPlayer = gameState.players.find(
      (p) => p.id === gameState.currentPlayer,
    );
    if (!currentPlayer) {
      throw new Error('Текущий игрок не найден');
    }

    if (currentPlayer.deck.length > 0) {
      const cardToAdd = currentPlayer.deck.shift();
      if (cardToAdd) {
        currentPlayer.hand.push(cardToAdd);
      }
    }

    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    gameState.turn += 1;
    game.currentTurn = gameState.currentPlayer;
    game.currentTurnIndex = gameState.currentPlayer - 1;

    this.checkGameEnd(gameState);

    game.gameState = gameState;
    await this.gameRepository.save(game);

    const gameResponse: Game = {
      id: game.id,
      players: game.players,
      gameState,
      currentTurn: game.currentTurn,
      currentTurnIndex: game.currentTurnIndex,
    };

    this.gameGateway.emitGameUpdate(gameId, gameState);
    return gameResponse;
  }

  private checkGameEnd(game: GameState) {
    game.players.forEach((player) => {
      if (player.life <= 0) {
        game.status = 'finished';
        game.winner = game.players.find((p) => p.id !== player.id);
        game.gameOver = true;
      }
    });
  }
}
