import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Card,
  CardProperty,
  CardType,
  GameState,
  Player,
  SelectedPlayArea,
  WizardBoard,
  WizardPropertyToken,
} from './types';
import { GameGateway } from './game.gateway';
import { Game } from './entities/game.entity';
import { Move } from './entities/move.entity';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from 'src/invitations/entities/invitation.entity';
import { CardService } from './card.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { wizardPropertyTokens } from 'src/cardData/wizardPropertyTokens';
import { playerAreas } from 'src/cardData/playerAreas';
import { GameStateService } from './game-state.service';
@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private gameRepository: Repository<Game>,
    @InjectRepository(Move) private moveRepository: Repository<Move>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private readonly gameGateway: GameGateway,
    private readonly cardService: CardService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
    private readonly gameStateService: GameStateService,
  ) {}

  async createGame(invitationId: number): Promise<Game> {
    const invitation = await this.validateInvitation(invitationId);
    const players = this.validatePlayers(invitation);

    const gameState = await this.initializeGameState(players);
    const game = this.gameRepository.create({
      players,
      gameState,
      currentTurn: 1,
      currentTurnIndex: 0,
      status: 'pending',
    });

    await this.gameRepository.save(game);

    // ✅ ИСПРАВЛЕНО: отправляем событие только первому игроку в очереди
    if (gameState.selectionQueue && gameState.selectionQueue.length > 0) {
      const firstPlayerId = gameState.selectionQueue[0];
      const firstPlayer = gameState.players.find((p) => p.id === firstPlayerId);
      if (firstPlayer) {
        this.gameGateway.emitSelectionRequired(game.id, firstPlayer.userId, {});
      }
    }

    const gameResponse = this.gameStateService.createGameResponse(game);
    this.gameGateway.emitGameUpdate(game.id.toString(), gameState);
    return gameResponse;
  }

  private async validateInvitation(invitationId: number): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['sender', 'receivers'],
    });
    if (!invitation || invitation.status !== 'accepted') {
      throw new Error('Приглашение не найдено или не принято');
    }
    return invitation;
  }

  private validatePlayers(invitation: Invitation): User[] {
    const players = [...invitation.receivers];
    if (players.length < 2 || players.length > 5) {
      throw new Error('Количество игроков должно быть от 2 до 5');
    }
    players.forEach((player, i) => {
      if (!player) {
        throw new Error(`Игрок не найден: player index-${i}, player-${player}`);
      }
    });
    return players;
  }

  private async initializeGameState(players: User[]): Promise<GameState> {
    const deck = await this.cardService.initializeDeck();
    const marketplace = await this.cardService.initializeMarketplace();
    const legendaryMarketplace =
      await this.cardService.initializeLegendaryMarketplace();
    const strayMagicDeck = await this.cardService.getCardsByType(
      CardType.StrayMagic,
    );
    const sluggishSticksDeck = await this.cardService.getCardsByType(
      CardType.SluggishStick,
    );

    const legendCount = 9 - players.length;
    const firstLegend = legendaryMarketplace.find(
      (marketplace) => marketplace.name === 'Однорукий одноглазый одномуд вуд',
    );
    if (!firstLegend) {
      throw new Error('Однорукий одноглазый одномуд вуд не найден');
    }
    const otherLegends = legendaryMarketplace.filter(
      (marketplace) => marketplace.name !== 'Однорукий одноглазый одномуд вуд',
    );
    const selectedLegends = this.cardService
      .shuffleDeck([...otherLegends])
      .slice(0, legendCount);

    const allWizardPropertyTokens: WizardPropertyToken[] = wizardPropertyTokens;
    const allFamiliars = await this.cardService.getCardsByType(
      CardType.Familiar,
    );

    const gameState: GameState = {
      players: players.map((user, index) =>
        this.createPlayer(
          user,
          index,
          deck,
          allWizardPropertyTokens,
          allFamiliars,
        ),
      ),
      currentPlayer: Math.floor(Math.random() * players.length) + 1,
      turn: 1,
      status: 'pending',
      currentMarketplace: [],
      currentLegendaryMarketplace: [],
      marketplace: this.cardService.shuffleDeck([...marketplace]),
      legendaryMarketplace: [firstLegend, ...selectedLegends],
      chaosCardDiscard: [],
      deadWizardTokens: players.length * 4,
      isTopLegendaryCardHidden: true,
      gameOver: false,
      strayMagicDeck: [...strayMagicDeck],
      sluggishSticksDeck: [...sluggishSticksDeck],
      destroyedCards: [],
      permanentCards: [],
      proposedProperties: {},
      proposedFamiliars: {},
      proposedPlayAreas: {},
      selectionQueue: players.map((u) => u.id), // ✅ ДОБАВЛЕНО: очередь выбора игроков
      currentSelectionPlayerIndex: 0, // ✅ ДОБАВЛЕНО: индекс текущего игрока в очереди
      krutagidonPrize: {
        id: 1,
        name: 'Главный приз Крутагидона',
        description:
          'В конце каждого хода ты берёшь на руку 6 карт из своей колоды и сбрасываешь одну из них',
        imageUrl: '',
        owner: null,
      },
    };

    this.initializePlayerHands(gameState);
    this.initializeMarketplace(gameState);
    gameState.currentLegendaryMarketplace =
      gameState.legendaryMarketplace.splice(0, 1);

    return gameState;
  }

  private createPlayer(
    user: User,
    index: number,
    deck: Card[],
    allWizardPropertyTokens: WizardPropertyToken[],
    allFamiliars: Card[],
  ): Player {
    const shuffledTokens = this.cardService.shuffleDeck([
      ...allWizardPropertyTokens,
    ]);
    const selectedToken = shuffledTokens[0];
    const shuffledFamiliars = this.cardService.shuffleDeck([...allFamiliars]);
    const selectedFamiliar = shuffledFamiliars[0];

    return {
      id: user.id,
      userId: user.id.toString(),
      username: user.username,
      deck: this.cardService.shuffleDeck([...deck]),
      hand: [],
      playArea: [],
      discard: [],
      health: 20,
      maxHealth: 25,
      power: 10, // 🧪 TESTING MODE: изменено с 0 на 10 для тестирования карт
      krutagidonCups: 0,
      deadWizardCount: 0,
      deadWizards: [],
      selectionCompleted: false,
      selectedFamiliar: null,
      selectedProperty: null,
      selectedPlayerArea: null,
      familiar: selectedFamiliar,
      wizardBoard: null,
      wizardPropertyToken: selectedToken,
      firstWizardPlayedThisTurn: false,
      firstCreaturePlayedThisTurn: false,
      firstTreasurePlayedThisTurn: false,
      firstSpellPlayedThisTurn: false,
    };
  }

  private initializePlayerHands(gameState: GameState): void {
    gameState.players.forEach((player) => {
      player.hand = player.deck.splice(0, 5);
    });
  }

  private initializeMarketplace(gameState: GameState): void {
    // ========================================
    // 🧪 TESTING MODE - Uncomment to enable
    // ========================================
    // Выберите 5 карт для тестирования по их именам:
    const testCards = [
      'Замок спрутобойни',
      'Грибучее болото',
      'Хоромы страсти',
      'Гора черепламени',
      'Шестёрочка', // Тест: удвоение эффектов лечения
      'Арена крутагидона', // Тест: удвоение урона от атак
      'Солнцеликий', // Тест: +2 мощи, взять 1 карту, атака 10 урона
      'Распальцун', // Тест: +5 мощи, -1 за мертвого волшебника
      'Эпичные схватки', // Тест: +3 мощи, атака = 2×защитные карты врага в сбросе
      'Двойняшки', // Тест: взять 2 карты
      'Рыцарь-сопленосец', // Тест: +2 мощи (базовая проверка)
    ];
    //
    // // Найти карты по именам
    for (const cardName of testCards) {
      const cardIndex = gameState.marketplace.findIndex(
        (card) => card.name === cardName,
      );
      if (cardIndex !== -1) {
        const card = gameState.marketplace.splice(cardIndex, 1)[0];
        gameState.currentMarketplace.push(card);
      } else {
        console.warn(`Карта "${cardName}" не найдена в колоде`);
      }
    }
    return; // Закомментируй эту строку для production режима
    // ========================================
    // END TESTING MODE
    // ========================================

    // Production режим - случайное заполнение барахолки
    // while (
    //   gameState.currentMarketplace.length < 5 &&
    //   gameState.marketplace.length > 0
    // ) {
    //   const newCard = gameState.marketplace.shift();
    //   if (newCard) {
    //     if (newCard.type === CardType.ChaosCard) {
    //       gameState.chaosCardDiscard.push(newCard);
    //     } else {
    //       gameState.currentMarketplace.push(newCard);
    //     }
    //   }
    // }
  }

  async getLobby(invitationId: number): Promise<any> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['sender', 'receivers'],
    });

    if (!invitation) {
      throw new Error('Приглашение не найдено');
    }

    const players = [invitation.sender, ...invitation.receivers];
    return {
      invitation: {
        id: invitation.id,
        status: invitation.status,
        inviterId: invitation.sender.id,
      },
      players: players.map((user) => ({
        id: user.id,
        username: user.username,
      })),
    };
  }

  async getGame(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players', 'winner'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    return this.gameStateService.createGameResponse(game);
  }

  async selectCards(
    gameId: string,
    playerId: string,
    selectedCards: {
      property: WizardPropertyToken;
      familiar: Card;
      playerArea: SelectedPlayArea;
    },
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });

    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    // console.log('gameState.players', gameState.players);
    // console.log('playerId', playerId);
    const player = gameState.players.find(
      (p) => p.userId === playerId.toString(),
    );
    console.log('player', player);
    console.log('player', !player);
    if (!player) {
      throw new Error('Игрок не найден');
    }

    if (player.selectionCompleted) {
      throw new Error('Игрок уже завершил выбор');
    }

    await this.validateSelectionOptions(gameId, playerId, selectedCards);

    player.selectedProperty = selectedCards.property;
    player.selectedFamiliar = selectedCards.familiar;
    player.selectedPlayerArea = selectedCards.playerArea;
    player.wizardPropertyToken = selectedCards.property;
    player.familiar = selectedCards.familiar;
    player.selectionCompleted = true;

    // ✅ ДОБАВЛЕНО: переход к следующему игроку в очереди
    if (
      gameState.selectionQueue &&
      gameState.currentSelectionPlayerIndex !== undefined
    ) {
      const currentIndex = gameState.currentSelectionPlayerIndex;
      const nextIndex = currentIndex + 1;

      if (nextIndex < gameState.selectionQueue.length) {
        gameState.currentSelectionPlayerIndex = nextIndex;
        const nextPlayerId = gameState.selectionQueue[nextIndex];
        const nextPlayer = gameState.players.find((p) => p.id === nextPlayerId);

        if (nextPlayer && !nextPlayer.selectionCompleted) {
          this.gameGateway.emitSelectionRequired(
            Number(gameId),
            nextPlayer.userId,
            {},
          );
        }
      }
    }

    if (gameState.players.every((p) => p.selectionCompleted)) {
      gameState.status = 'active';
      game.status = 'active';
    }

    await this.gameStateService.saveGameState(game, gameState);
    this.gameGateway.emitSelectionUpdated(gameId, playerId, {
      familiar: selectedCards.familiar,
      property: selectedCards.property,
      playerArea: selectedCards.playerArea,
    });

    return this.gameStateService.createGameResponse(game);
  }

  private async validateSelectionOptions(
    gameId: string,
    playerId: string,
    selectedCards: {
      property: WizardPropertyToken;
      familiar: Card;
      playerArea: SelectedPlayArea;
    },
  ): Promise<void> {
    const options = await this.getSelectionOptions(gameId, playerId);
    const isPropertyAvailable = options.properties.some(
      (prop) => prop.id === selectedCards.property.id,
    );
    const isFamiliarAvailable = options.familiars.some(
      (fam) => fam.id === selectedCards.familiar.id,
    );
    const isPlayAreaAvailable = options.playerAreas.some(
      (area) => area.id === selectedCards.playerArea.id,
    );

    if (!isPropertyAvailable) {
      throw new Error('Выбранное колдунское свойство недоступно');
    }
    if (!isFamiliarAvailable) {
      throw new Error('Выбранный фамильяр недоступен');
    }
    if (!isPlayAreaAvailable) {
      throw new Error('Выбранное игровое поле недоступно');
    }
  }

  async getSelectionOptions(
    gameId: string,
    playerId: string,
  ): Promise<{
    properties: WizardPropertyToken[];
    familiars: Card[];
    playerAreas: SelectedPlayArea[];
  }> {
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

    const allWizardPropertyTokens: WizardPropertyToken[] = wizardPropertyTokens;
    const allFamiliars = await this.cardService.getCardsByType(
      CardType.Familiar,
    );
    const allPlayAreas: SelectedPlayArea[] = playerAreas;

    // Если опции уже были сгенерированы для этого игрока, возвращаем их
    if (
      gameState.proposedProperties?.[playerId] &&
      gameState.proposedFamiliars?.[playerId] &&
      gameState.proposedPlayAreas?.[playerId]
    ) {
      return {
        properties: allWizardPropertyTokens.filter((prop) =>
          gameState.proposedProperties[playerId].includes(prop.id),
        ),
        familiars: allFamiliars.filter((fam) =>
          gameState.proposedFamiliars[playerId].includes(fam.id),
        ),
        playerAreas: allPlayAreas.filter((area) =>
          gameState.proposedPlayAreas[playerId].includes(area.id),
        ),
      };
    }

    const selectedProperties = gameState.players
      .filter((p) => p.selectedProperty)
      .map((p) => p.selectedProperty!.id);
    const selectedFamiliars = gameState.players
      .filter((p) => p.selectedFamiliar)
      .map((p) => p.selectedFamiliar!.id);
    const selectedPlayAreas = gameState.players
      .filter((p) => p.selectedPlayerArea)
      .map((p) => p.selectedPlayerArea!.id);

    const proposedProperties = Object.values(
      gameState.proposedProperties,
    ).flat();
    const proposedFamiliars = Object.values(gameState.proposedFamiliars).flat();
    const proposedPlayAreas = Object.values(gameState.proposedPlayAreas).flat();

    const availableWizardProperties = allWizardPropertyTokens.filter(
      (prop) =>
        !selectedProperties.includes(prop.id) &&
        !proposedProperties.includes(prop.id),
    );
    const availableFamiliars = allFamiliars.filter(
      (fam) =>
        !selectedFamiliars.includes(fam.id) &&
        !proposedFamiliars.includes(fam.id),
    );
    // ✅ ИСПРАВЛЕНО: playerArea теперь фильтруются по выбранным и предложенным
    const availablePlayAreas = allPlayAreas.filter(
      (area) =>
        !selectedPlayAreas.includes(area.id) &&
        !proposedPlayAreas.includes(area.id),
    );

    if (availableWizardProperties.length < 2) {
      throw new Error('Недостаточно доступных свойств для выбора');
    }
    if (availableFamiliars.length < 2) {
      throw new Error('Недостаточно доступных фамильяров для выбора');
    }
    if (availablePlayAreas.length < 2) {
      throw new Error('Недостаточно доступных игровых полей для выбора');
    }

    const randomWizardProperties = this.getRandomElements(
      availableWizardProperties,
      2,
    );
    const randomFamiliars = this.getRandomElements(availableFamiliars, 2);

    // ✅ ВОЗВРАЩЕНО: playerArea выбираются независимо от фамильяров
    const randomPlayerAreas = this.getRandomElements(availablePlayAreas, 2);

    gameState.proposedProperties[playerId] = randomWizardProperties.map(
      (prop) => prop.id,
    );
    gameState.proposedFamiliars[playerId] = randomFamiliars.map(
      (fam) => fam.id,
    );
    gameState.proposedPlayAreas[playerId] = randomPlayerAreas.map(
      (area) => area.id,
    );

    await this.gameStateService.saveGameState(game, gameState);

    return {
      properties: randomWizardProperties,
      familiars: randomFamiliars,
      playerAreas: randomPlayerAreas,
    };
  }

  async playCard(
    gameId: string,
    cardId: number,
    opponentId: number | null = null,
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

    // ✅ ИСПРАВЛЕНО: Блокируем атакующего игрока, пока противник решает защищаться
    if (
      gameState.pendingAttack &&
      gameState.pendingAttack.attackerId === player.id
    ) {
      throw new Error('Дождитесь ответа противника на вашу атаку');
    }

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
      throw new Error('Карта не найдена в руке');
    }

    if (!card.isAttack && opponentId) {
      throw new Error('Для неатакующей карты opponentId должен быть null');
    }

    if (card.isAttack && !opponentId) {
      return await this.handleAttackTargetSelection(
        game,
        gameState,
        player,
        card,
      );
    }

    if (card.isAttack && opponentId) {
      const opponent = gameState.players.find((p) => p.id === opponentId);
      if (!opponent) {
        throw new Error('Противник не найден');
      }

      // ✅ ИСПРАВЛЕНО: Всегда показываем диалог защиты, независимо от наличия защитных карт
      // const hasDefenseCards = opponent.hand.some((c) => c.isDefense);
      // if (hasDefenseCards) {
      return await this.handleDefenseRequest(
        game,
        gameState,
        player,
        opponent,
        card,
      );
      // }
    }

    await this.applyCardEffect(game, gameState, player, card, opponentId);
    return this.gameStateService.createGameResponse(game);
  }

  private async handleAttackTargetSelection(
    game: Game,
    gameState: GameState,
    player: Player,
    card: Card,
  ): Promise<Game> {
    if (gameState.pendingPlayCard) {
      throw new Error('Уже ожидается выбор цели для другой карты');
    }

    gameState.pendingPlayCard = { playerId: player.id, cardId: card.id };
    const attackTargets = gameState.players
      .filter((p) => p.id !== player.id && p.health > 0)
      .map((p) => p.id);

    if (attackTargets.length === 0) {
      throw new Error('Нет доступных целей для атаки');
    }

    this.gameGateway.emitAttackTargetRequired(
      game.id.toString(),
      player.userId,
      {
        cardId: card.id,
        targets: attackTargets,
      },
    );
    this.gameGateway.emitAttackTargetNotification(
      game.id.toString(),
      player.userId,
      card.id,
    );

    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  private async handleDefenseRequest(
    game: Game,
    gameState: GameState,
    player: Player,
    opponent: Player,
    card: Card,
  ): Promise<Game> {
    // Перемещаем атакующую карту из руки в игровую зону
    // (карта считается сыгранной при начале атаки)
    player.hand = player.hand.filter((c) => c.id !== card.id);
    player.playArea.push(card);

    gameState.pendingAttack = {
      attackerId: player.id,
      opponentId: opponent.id,
      cardId: card.id,
      damage: card.damage || 0,
    };

    this.gameGateway.emitDefenseRequired(game.id.toString(), opponent.userId, {
      attackerId: player.id,
      cardId: card.id,
      opponentId: opponent.id,
      damage: card.damage || 0,
    });

    this.gameGateway.emitAttackNotification(
      game.id.toString(),
      player.userId,
      opponent.userId,
      card.id,
      card.damage || 0,
    );

    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  private async applyCardEffect(
    game: Game,
    gameState: GameState,
    player: Player,
    card: Card,
    opponentId: number | null,
    defenseCardId: number | null = null,
  ): Promise<void> {
    let opponent: Player | null | undefined = null;

    // Всегда применяем свойства карты, независимо от того, атакующая она или нет
    await this.playerService.applyCardProperties(
      game,
      card,
      player.id,
      opponentId,
    );

    // Применяем эффект карты (например, "Залить", "Кутуз" и т.д.)
    if (opponentId) {
      opponent = gameState.players.find((p) => p.id === opponentId);
      if (!opponent) {
        throw new Error('Противник не найден');
      }
    }

    // Обрабатываем защитную карту, если она была сыграна
    if (card.isAttack && opponentId && opponent) {
      if (defenseCardId) {
        const defenseCard = opponent.hand.find((c) => c.id === defenseCardId);
        if (!defenseCard || !defenseCard.isDefense) {
          throw new Error(
            'Выбранная защитная карта не найдена или недействительна',
          );
        }

        this.playerService.applyDefenseCard(
          game,
          defenseCard,
          opponent,
          player,
        );
        opponent.hand = opponent.hand.filter((c) => c.id !== defenseCardId);
        opponent.playArea.push(defenseCard);
      }
    }

    // Перемещаем карту в игровую зону (если её там ещё нет)
    // Карта может уже быть в playArea, если была перемещена в handleDefenseRequest
    if (!player.playArea.find((c) => c.id === card.id)) {
      player.hand = player.hand.filter((c) => c.id !== card.id);
      player.playArea.push(card);
    }

    // Применяем эффекты жетона колдунского свойства
    this.playerService.applyWizardPropertyTokenEffect(
      gameState,
      player,
      'playCard',
      card,
    );

    // Сохраняем ход
    await this.gameStateService.createMove(game, player, {
      type: 'play-card',
      cardId: card.id,
      opponentId,
      effect: card.effect,
    });

    // Очищаем состояние атаки
    gameState.pendingAttack = undefined;

    // Проверяем, не закончилась ли игра
    await this.checkGameEnd(gameState, game);
    await this.gameStateService.saveGameState(game, gameState);
  }

  async resolveDefense(
    gameId: string,
    opponentId: string,
    defenseCardId: number | null,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });
    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    if (
      !gameState.pendingAttack ||
      gameState.pendingAttack.opponentId.toString() !== opponentId
    ) {
      throw new Error('Нет ожидаемой атаки для этого игрока');
    }

    const {
      attackerId,
      cardId,
      opponentId: pendingAttackOpponentId,
    } = gameState.pendingAttack;
    const player = gameState.players.find((p) => p.id === attackerId);
    if (!player) {
      throw new Error('Атакующий игрок не найден');
    }

    // Ищем атакующую карту в игровой зоне (она была перемещена туда в handleDefenseRequest)
    const card = player.playArea.find((c) => c.id === cardId);
    if (!card) {
      throw new Error('Атакующая карта не найдена в игровой зоне');
    }

    const opponent = gameState.players.find(
      (p) => p.id === +pendingAttackOpponentId,
    );
    if (!opponent) {
      throw new Error('Противник не найден');
    }

    await this.applyCardEffect(
      game,
      gameState,
      player,
      card,
      opponent.id,
      defenseCardId,
    );
    return this.gameStateService.createGameResponse(game);
  }

  async buyCard(
    gameId: string,
    cardId: number,
    isLegendary: boolean,
    isStrayMagic: boolean = false,
    isFamiliar: boolean = false,
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

    if (gameState.currentPlayer !== player.id) {
      throw new Error('Не ваш ход');
    }

    // ✅ ИСПРАВЛЕНО: Блокируем атакующего игрока, пока противник решает защищаться
    if (
      gameState.pendingAttack &&
      gameState.pendingAttack.attackerId === player.id
    ) {
      throw new Error('Дождитесь ответа противника на вашу атаку');
    }

    const { card, market } = this.findCardInMarket(
      gameState,
      cardId,
      isLegendary,
      isStrayMagic,
      isFamiliar,
      player,
    );
    const cost = isStrayMagic ? 3 : card.cost;
    if (player.power < cost) {
      throw new Error('Недостаточно мощи для покупки');
    }

    player.power -= cost;
    gameState.lastBoughtOrGotCardCost = cost;

    if (player.putNextCardOnTopOfDeck) {
      player.deck.unshift(card);
      player.putNextCardOnTopOfDeck = false;
    } else {
      player.discard.push(card);
    }

    this.updateMarket(
      gameState,
      market,
      cardId,
      isLegendary,
      isStrayMagic,
      isFamiliar,
      player,
    );

    if (player.playAttackOnGetOrBuy) {
      const attackCard = player.playArea.find((c) =>
        c.properties.includes(
          CardProperty.EachTimeYouGetOrBuyCardInTernPlayAttack,
        ),
      );
      if (attackCard && attackCard.isAttack) {
        const attackTargets = gameState.players
          .filter((p) => p.id !== player.id && p.health > 0)
          .map((p) => p.id);
        this.gameGateway.emitAttackRequired(+gameId, player.userId, {
          cardId: attackCard.id,
          damage: card.cost,
          targets: attackTargets,
        });
      }
    }

    this.playerService.applyWizardPropertyTokenEffect(
      gameState,
      player,
      'buyCard',
      card,
    );

    await this.gameStateService.createMove(game, player, {
      type: 'buy-card',
      cardId,
      isLegendary,
      isStrayMagic,
      isFamiliar,
    });

    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  private findCardInMarket(
    gameState: GameState,
    cardId: number,
    isLegendary: boolean,
    isStrayMagic: boolean,
    isFamiliar: boolean,
    player: Player,
  ): { card: Card; market: Card[] } {
    let card: Card | undefined;
    let market: Card[] = [];

    if (isLegendary) {
      market = gameState.currentLegendaryMarketplace;
      card = market.find((c) => c.id === cardId);
    } else if (isStrayMagic) {
      market = gameState.strayMagicDeck;
      card = market[0];
    } else if (isFamiliar) {
      if (!player.familiar) {
        throw new Error('Фамильяр не найден');
      }
      card = player.familiar;
      if (card?.id !== cardId) {
        throw new Error('Вы можете купить только своего фамильяра');
      }
    } else {
      market = gameState.currentMarketplace;
      card = market.find((c) => c.id === cardId);
    }

    if (!card) {
      throw new Error('Карта не найдена');
    }

    return { card, market };
  }

  private updateMarket(
    gameState: GameState,
    market: Card[],
    cardId: number,
    isLegendary: boolean,
    isStrayMagic: boolean,
    isFamiliar: boolean,
    player: Player,
  ): void {
    if (isLegendary) {
      gameState.currentLegendaryMarketplace = market.filter(
        (c) => c.id !== cardId,
      );
      if (gameState.legendaryMarketplace.length > 0) {
        gameState.currentLegendaryMarketplace = [
          ...gameState.currentLegendaryMarketplace,
          ...gameState.legendaryMarketplace.splice(0, 1),
        ];
      }
    } else if (isStrayMagic) {
      gameState.strayMagicDeck = gameState.strayMagicDeck.filter(
        (c) => c.id !== cardId,
      );
    } else if (isFamiliar) {
      player.familiar = null;
    } else {
      gameState.currentMarketplace = market.filter((c) => c.id !== cardId);
      if (gameState.marketplace.length > 0) {
        gameState.currentMarketplace = [
          ...gameState.currentMarketplace,
          ...gameState.marketplace.splice(0, 1),
        ];
      }
    }
  }

  async startTurn(gameId: string): Promise<Game> {
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

    while (
      gameState.currentMarketplace.length < 5 &&
      gameState.marketplace.length > 0
    ) {
      const newCard = gameState.marketplace.shift();
      if (newCard) {
        if (newCard.type === CardType.StrayMagic) {
          this.turnService.applyStrayMagicEffect(game, newCard, currentPlayer);
          gameState.chaosCardDiscard.push(newCard);
        } else {
          gameState.currentMarketplace.push(newCard);
        }
      }
    }

    this.turnService.applyStartOfTurnEffects(gameState, currentPlayer);
    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
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

    currentPlayer.discard = [
      ...currentPlayer.discard,
      ...currentPlayer.hand,
      ...currentPlayer.playArea.filter((card) => !card.isPermanent),
    ];
    currentPlayer.hand = [];
    currentPlayer.playArea = currentPlayer.playArea.filter(
      (card) => card.isPermanent,
    );
    currentPlayer.power = 0;

    this.turnService.applyEndOfTurnEffects(game, currentPlayer);
    await this.playerService.drawCard(game, currentPlayer, 5);

    if (gameState.krutagidonPrize?.owner === currentPlayer) {
      await this.playerService.drawCard(game, currentPlayer, 6);
      if (currentPlayer.hand.length > 0) {
        const cardToDiscard = currentPlayer.hand.shift();
        if (cardToDiscard) {
          currentPlayer.discard.push(cardToDiscard);
        }
      }
    }

    if (
      gameState.isTopLegendaryCardHidden &&
      gameState.currentLegendaryMarketplace.length > 0
    ) {
      const legend = gameState.currentLegendaryMarketplace[0];
      if (!legend) {
        throw new Error('Легенды нет');
      }
      gameState.isTopLegendaryCardHidden = false;
      this.gameGateway.emitLegendaryCardRevealed(gameId, legend);
      this.turnService.applyLegendaryGroupAttack(game, legend);
    }

    const totalPlayers = gameState.players.length;
    const currentPlayerIndex = gameState.players.findIndex(
      (p) => p.id === gameState.currentPlayer,
    );
    const nextPlayerIndex = (currentPlayerIndex + 1) % totalPlayers;
    const nextPlayer = gameState.players[nextPlayerIndex];

    gameState.currentPlayer = nextPlayer.id;
    gameState.turn += 1;
    game.currentTurn = gameState.currentPlayer;
    game.currentTurnIndex = nextPlayerIndex;

    // Применяем эффекты начала хода для следующего игрока
    // Заполняем барахолку до 5 карт
    while (
      gameState.currentMarketplace.length < 5 &&
      gameState.marketplace.length > 0
    ) {
      const newCard = gameState.marketplace.shift();
      if (newCard) {
        if (newCard.type === CardType.StrayMagic) {
          this.turnService.applyStrayMagicEffect(game, newCard, nextPlayer);
          gameState.chaosCardDiscard.push(newCard);
        } else {
          gameState.currentMarketplace.push(newCard);
        }
      }
    }

    // Сбрасываем флаги и применяем эффекты начала хода
    this.turnService.applyStartOfTurnEffects(gameState, nextPlayer);

    await this.checkGameEnd(gameState, game);
    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  private async checkGameEnd(gameState: GameState, game: Game): Promise<void> {
    const alivePlayers = gameState.players.filter(
      (player) => player.health > 0,
    );

    const isLegendaryMarketplaceEmpty =
      gameState.legendaryMarketplace.length === 0 &&
      gameState.currentLegendaryMarketplace.length === 0;
    const cannotFillMarketplace =
      gameState.currentMarketplace.length < 5 &&
      gameState.marketplace.length === 0;
    const noDeadWizardTokens = gameState.deadWizardTokens <= 0;

    if (
      isLegendaryMarketplaceEmpty ||
      cannotFillMarketplace ||
      noDeadWizardTokens
    ) {
      gameState.status = 'finished';
      gameState.gameOver = true;
      game.status = 'finished';

      const playerScores = gameState.players.map((player) => {
        const playerDeck = [
          ...player.deck,
          ...player.hand,
          ...player.discard,
          ...player.playArea,
        ];
        let score = playerDeck.reduce(
          (sum, card) => sum + (card.victoryPoints || 0),
          0,
        );
        score -= player.deadWizards.length * 3;
        const sluggishSticksCount = playerDeck.filter(
          (card) => card.type === CardType.SluggishStick,
        ).length;
        score -= sluggishSticksCount;
        const legendCount = playerDeck.filter(
          (card) => card.type === CardType.Legend,
        ).length;
        return { player, score, legendCount };
      });

      playerScores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.legendCount !== a.legendCount)
          return b.legendCount - a.legendCount;
        return a.player.deadWizards.length - b.player.deadWizards.length;
      });

      const winner = playerScores[0].player;
      const winnerUser = await this.userRepository.findOne({
        where: { id: +winner.userId },
      });
      if (winnerUser) {
        game.winner = winnerUser;
        gameState.winner = winner;
      } else {
        gameState.winner = null;
      }
    }

    await this.gameRepository.save(game);
  }

  getRandomElements<T>(array: T[], count: number): T[] {
    if (count > array.length) return array;
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  async destroyCardFromDiscard(
    gameId: string,
    playerId: string,
    cardId: number,
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

    if (gameState.currentPlayer !== player.id) {
      throw new Error('Не ваш ход');
    }

    const cardIndex = player.discard.findIndex((card) => card.id === cardId);
    if (cardIndex === -1) {
      throw new Error('Карта не найдена в сбросе');
    }

    const card = player.discard.splice(cardIndex, 1)[0];
    gameState.destroyedCards.push(card);

    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  async handleTopDeckSelection(
    gameId: string,
    playerId: string,
    action: string,
    cardId: number,
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

    if (gameState.currentPlayer !== player.id) {
      throw new Error('Не ваш ход');
    }

    if (player.deck.length === 0 || player.deck[0].id !== cardId) {
      throw new Error('Верхняя карта колоды не совпадает');
    }

    const topCard = player.deck.shift();
    if (!topCard) {
      throw new Error('Не найдено верхней карты');
    }

    if (action === 'take' || action === 'draw') {
      player.hand.push(topCard);
    } else if (action === 'remove') {
      gameState.destroyedCards.push(topCard);
    } else if (action === 'return') {
      player.deck.push(topCard);
      this.playerService.shuffleDeck(player.deck);
    }

    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  async resolveAttackTarget(
    gameId: string,
    playerId: string,
    opponentId: number,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });
    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    if (
      !gameState.pendingPlayCard ||
      gameState.pendingPlayCard.playerId !== +playerId
    ) {
      throw new Error('Нет ожидаемой карты для выбора цели');
    }

    const { cardId } = gameState.pendingPlayCard;
    const player = gameState.players.find((p) => p.id === +playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }

    const card = player.hand.find((c) => c.id === cardId);
    if (!card) {
      throw new Error('Карта не найдена в руке');
    }

    gameState.pendingPlayCard = undefined;

    const opponent = gameState.players.find((p) => p.id === opponentId);
    if (!opponent || opponent.health <= 0) {
      throw new Error('Недопустимая цель атаки');
    }

    // ✅ ИСПРАВЛЕНО: Всегда показываем диалог защиты, независимо от наличия защитных карт
    // const hasDefenseCards = opponent.hand.some((c) => c.isDefense);
    // if (hasDefenseCards) {
    return await this.handleDefenseRequest(
      game,
      gameState,
      player,
      opponent,
      card,
    );
    // }

    // await this.applyCardEffect(game, gameState, player, card, opponentId);
    // return this.gameStateService.createGameResponse(game);
  }

  async cancelAttackTargetSelection(
    gameId: string,
    playerId: string,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({
      where: { id: +gameId },
      relations: ['players'],
    });
    if (!game) {
      throw new Error('Игра не найдена');
    }

    const gameState: GameState = game.gameState;
    const player = gameState.players.find((p) => p.id === +playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }

    if (
      !gameState.pendingPlayCard ||
      gameState.pendingPlayCard.playerId !== +playerId
    ) {
      throw new Error('Нет ожидаемого выбора цели для этого игрока');
    }

    gameState.pendingPlayCard = undefined;
    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  async resolveTopDeckSelection(
    gameId: string,
    playerId: string,
    selections: { enemyId: number; cardId: number; discard: boolean }[],
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

    if (
      !gameState.pendingTopDeckSelection ||
      gameState.pendingTopDeckSelection.playerId !== player.id
    ) {
      throw new Error('Нет ожидаемого выбора карт для сброса');
    }

    for (const { enemyId, cardId, discard } of selections) {
      const enemy = gameState.players.find((p) => p.id === enemyId);
      if (enemy && enemy.deck.length > 0 && enemy.deck[0].id === cardId) {
        const card = enemy.deck.shift();
        if (card) {
          if (discard) {
            gameState.destroyedCards.push(card);
          } else {
            enemy.deck.push(card);
            this.playerService.shuffleDeck(enemy.deck);
          }
        }
      }
    }

    gameState.pendingTopDeckSelection = undefined;
    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  async resolveDestroyCardSelection(
    gameId: string,
    playerId: string,
    cardId: number,
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

    if (
      !gameState.pendingDestroyCardSelection ||
      gameState.pendingDestroyCardSelection.playerId !== player.id
    ) {
      throw new Error('Нет ожидаемого выбора карты для уничтожения');
    }

    if (gameState.pendingDestroyCardSelection.source === 'hand') {
      const card = player.hand.find((c) => c.id === cardId);
      if (card) {
        player.hand = player.hand.filter((c) => c.id !== cardId);
        gameState.destroyedCards.push(card);
      }
    }

    gameState.pendingDestroyCardSelection = undefined;
    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }

  async resolveEnemySelection(
    gameId: string,
    playerId: string,
    enemyId: number,
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

    if (
      !gameState.pendingEnemySelection ||
      gameState.pendingEnemySelection.playerId !== player.id
    ) {
      throw new Error('Нет ожидаемого выбора врага');
    }

    const enemy = gameState.players.find((p) => p.id === enemyId);
    if (!enemy || !gameState.pendingEnemySelection.targets.includes(enemyId)) {
      throw new Error('Недопустимый выбор врага');
    }

    if (gameState.pendingEnemySelection.action === 'giveDeadWizard') {
      if (player.deadWizardCount > 0) {
        player.deadWizardCount -= 1;
        enemy.deadWizardCount += 1;
      }
    }

    gameState.pendingEnemySelection = undefined;
    await this.gameStateService.saveGameState(game, gameState);
    return this.gameStateService.createGameResponse(game);
  }
}
