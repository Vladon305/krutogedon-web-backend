import { Injectable } from '@nestjs/common';
import {
  Card,
  CardAttackProperty,
  CardDefenseProperty,
  CardProperty,
  CardType,
  DeadWizard,
  Game,
  GameState,
  Player,
} from './types';
import { GameGateway } from './game.gateway';
import { GameStateService } from './game-state.service';
@Injectable()
export class PlayerService {
  constructor(
    private readonly gameGateway: GameGateway,
    private readonly gameStateService: GameStateService,
  ) {}

  private dealDamage(
    gameState: GameState,
    target: Player,
    damage: number,
    attacker: Player,
  ): void {
    // Проверка на удвоение урона от Арены крутагидона
    const hasArena = attacker.playArea.some((card) =>
      card.properties.includes(CardProperty.DoubleAttackDamage),
    );

    if (hasArena) {
      damage *= 2;
    }

    target.health -= damage;
    if (target.health < 1) {
      this.handlePlayerDeath(gameState, target, attacker);
    }
  }

  private getAliveEnemies(gameState: GameState, player: Player): Player[] {
    return gameState.players.filter((p) => p.id !== player.id && p.health > 0);
  }

  private getLeftAndRightEnemies(
    gameState: GameState,
    player: Player,
  ): Player[] {
    const playerIndex = gameState.players.findIndex((p) => p.id === player.id);
    const totalPlayers = gameState.players.length;
    const leftIndex = (playerIndex - 1 + totalPlayers) % totalPlayers;
    const rightIndex = (playerIndex + 1) % totalPlayers;
    return [gameState.players[leftIndex], gameState.players[rightIndex]].filter(
      (p) => p.health > 0,
    );
  }

  private countDefenseCardsInDiscard(discard: Card[]): number {
    return discard.filter((card) => card.isDefense).length;
  }

  private countLegendsInDiscard(discard: Card[]): number {
    return discard.filter((card) => card.type === CardType.Legend).length;
  }

  private countSluggishSticks(playArea: Card[], discard: Card[]): number {
    return [...playArea, ...discard].filter(
      (card) => card.type === CardType.SluggishStick,
    ).length;
  }

  private countPermanentCards(playArea: Card[]): number {
    return playArea.filter((card) => card.isPermanent).length;
  }

  private getWeakestEnemy(enemies: Player[]): Player | null {
    if (enemies.length === 0) return null;
    return enemies.reduce((weakest, current) =>
      current.health < weakest.health ? current : weakest,
    );
  }

  private addSluggishStick(gameState: GameState, target: Player): void {
    const sluggishStick = gameState.sluggishSticksDeck.shift();
    if (sluggishStick) {
      target.deck.push(sluggishStick);
      this.shuffleDeck(target.deck);
    }
  }

  shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private addCardToHand(player: Player, card: Card): void {
    player.hand.push(card);
  }

  private removeCardFromHandOrDiscard(
    player: Player,
    cardId: number,
  ): Card | null {
    const cardInHand = player.hand.find((c) => c.id === cardId);
    if (cardInHand) {
      player.hand = player.hand.filter((c) => c.id !== cardId);
      return cardInHand;
    }
    const cardInDiscard = player.discard.find((c) => c.id === cardId);
    if (cardInDiscard) {
      player.discard = player.discard.filter((c) => c.id !== cardId);
      return cardInDiscard;
    }
    return null;
  }

  async drawCard(game: Game, player: Player, count: number = 1): Promise<void> {
    for (let i = 0; i < count; i++) {
      if (player.deck.length === 0) {
        player.deck = this.shuffleDeck([...player.discard]);
        player.discard = [];
      }

      const cardToDraw = player.deck.shift();
      if (cardToDraw) {
        player.hand.push(cardToDraw);
        await this.handleDrawCardAttack(game, player, cardToDraw);
      }
    }
  }

  private async handleDrawCardAttack(
    game: Game,
    player: Player,
    drawnCard: Card,
  ): Promise<void> {
    if (!player.playAttackOnGetOrBuy) return;

    const attackCard = player.playArea.find((c) =>
      c.properties.includes(
        CardProperty.EachTimeYouGetOrBuyCardInTernPlayAttack,
      ),
    );

    if (attackCard && attackCard.isAttack) {
      const attackTargets = game.gameState.players
        .filter((p) => p.id !== player.id && p.health > 0)
        .map((p) => p.id);
      this.gameGateway.emitAttackRequired(game.id, player.userId, {
        cardId: attackCard.id,
        damage: drawnCard.cost,
        targets: attackTargets,
      });
    }
  }

  async applyCardProperties(
    game: Game,
    card: Card,
    playerId: number,
    opponentId: number | null = null,
  ): Promise<void> {
    const player = game.gameState.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Игрок не найден');
    }

    const isFirstCardPlayed = player.playArea.length === 0;

    for (const property of card.properties) {
      if (property === CardProperty.IfItFirstCardToPlay) {
        if (isFirstCardPlayed) {
          const relatedProperties = card.properties.filter(
            (p) => p !== CardProperty.IfItFirstCardToPlay,
          );
          for (const p of relatedProperties) {
            await this.applyProperty(game, p, player, opponentId);
          }
        }
      } else {
        await this.applyProperty(game, property, player, opponentId);
      }
    }

    if (card.isAttack && opponentId) {
      const opponent = game.gameState.players.find((p) => p.id === opponentId);
      if (!opponent) {
        throw new Error('Противник не найден');
      }
      for (const property of card.attackProperties) {
        await this.applyAttackProperty(game, property, player, opponent);
      }
    }

    if (card.isDefense) {
      for (const property of card.defenseProperties) {
        this.applyDefenseProperty(property, player);
      }
    }

    // Триггеры для постоянных карт (мест) - срабатывают при разыгрывании первой карты определённого типа за ход

    // Гора черепламени: при разыгрывании первого волшебника
    // Защита от undefined (для старых сохранений)
    if (player.firstWizardPlayedThisTurn === undefined) {
      player.firstWizardPlayedThisTurn = false;
    }

    if (card.type === CardType.Wizard && !player.firstWizardPlayedThisTurn) {
      const permanentCards = player.playArea.filter((c) => c.isPermanent);
      const hasIfHaveFirstWizard = permanentCards.some((c) =>
        c.properties.includes(CardProperty.IfHaveFirstWizardDrawOneCard),
      );

      if (hasIfHaveFirstWizard) {
        await this.drawCard(game, player, 1);
      }

      // Устанавливаем флаг независимо от наличия постоянной карты
      player.firstWizardPlayedThisTurn = true;
    }
    // Замок спрутобойни: при разыгрывании первой твари
    // Защита от undefined (для старых сохранений)
    if (player.firstCreaturePlayedThisTurn === undefined) {
      player.firstCreaturePlayedThisTurn = false;
    }

    if (
      card.type === CardType.Creature &&
      !player.firstCreaturePlayedThisTurn
    ) {
      const permanentCards = player.playArea.filter((c) => c.isPermanent);
      const hasIfHaveFirstCreature = permanentCards.some((c) =>
        c.properties.includes(CardProperty.IfHaveFirstCreatureDrawOneCard),
      );

      if (hasIfHaveFirstCreature) {
        await this.drawCard(game, player, 1);
      }

      // Устанавливаем флаг независимо от наличия постоянной карты
      player.firstCreaturePlayedThisTurn = true;
    }

    // Грибучее болото: при разыгрывании первого сокровища
    // Защита от undefined (для старых сохранений)
    if (player.firstTreasurePlayedThisTurn === undefined) {
      player.firstTreasurePlayedThisTurn = false;
    }

    if (
      card.type === CardType.Treasure &&
      !player.firstTreasurePlayedThisTurn
    ) {
      const permanentCards = player.playArea.filter((c) => c.isPermanent);
      const hasIfHaveFirstTreasure = permanentCards.some((c) =>
        c.properties.includes(CardProperty.IfHaveFirstTreasureDrawOneCard),
      );

      if (hasIfHaveFirstTreasure) {
        await this.drawCard(game, player, 1);
      }

      // Устанавливаем флаг независимо от наличия постоянной карты
      player.firstTreasurePlayedThisTurn = true;
    }

    // Хоромы страсти: при разыгрывании первого заклинания
    // Защита от undefined (для старых сохранений)
    if (player.firstSpellPlayedThisTurn === undefined) {
      player.firstSpellPlayedThisTurn = false;
    }

    if (card.type === CardType.Spell && !player.firstSpellPlayedThisTurn) {
      const permanentCards = player.playArea.filter((c) => c.isPermanent);
      const hasIfHaveFirstSpell = permanentCards.some((c) =>
        c.properties.includes(CardProperty.IfHaveFirstSpellDrawOneCard),
      );

      if (hasIfHaveFirstSpell) {
        await this.drawCard(game, player, 1);
      }

      // Устанавливаем флаг независимо от наличия постоянной карты
      player.firstSpellPlayedThisTurn = true;
    }
  }

  private async applyProperty(
    game: Game,
    property: CardProperty,
    player: Player,
    opponentId: number | null,
  ): Promise<void> {
    switch (property) {
      case CardProperty.AddOnePower:
        player.power += 1;
        break;
      case CardProperty.AddTwoPower:
        player.power += 2;
        break;
      case CardProperty.AddThreePower:
        player.power += 3;
        break;
      case CardProperty.AddFourPower:
        player.power += 4;
        break;
      case CardProperty.AddFivePower:
        player.power += 5;
        break;

      case CardProperty.DrawOneCard:
      case CardProperty.DrawTwoCard:
      case CardProperty.DrawThreeCards:
      case CardProperty.DrawFourCards:
        // Фикс: явное указание количества карт вместо regex (drawTwoCard содержит слово "Two", а не цифру)
        const cardsToDraw =
          property === CardProperty.DrawOneCard
            ? 1
            : property === CardProperty.DrawTwoCard
              ? 2
              : property === CardProperty.DrawThreeCards
                ? 3
                : property === CardProperty.DrawFourCards
                  ? 4
                  : 1;
        await this.drawCard(game, player, cardsToDraw);
        break;

      case CardProperty.GainOneHealthForEveryConstant:
        const constantCount = player.playArea.filter(
          (card) => card.isPermanent,
        ).length;
        player.health = Math.min(
          player.health + constantCount,
          player.maxHealth,
        );
        break;

      case CardProperty.GainTwoHealth:
      case CardProperty.GainThreeHealth:
        const healthToGain = parseInt(property.match(/\d+/)?.[0] || '0');
        player.health = Math.min(
          player.health + healthToGain,
          player.maxHealth,
        );
        break;

      case CardProperty.AddOnePowerForEachDeadWizard:
        player.power += player.deadWizardCount;
        break;

      case CardProperty.RemoveOnePowerForEachDeadWizard:
        player.power = Math.max(0, player.power - player.deadWizardCount);
        break;

      case CardProperty.IfHaveOverThreeDeadWizardDrawThreeCardsElseAddTwoPower:
        if (player.deadWizardCount > 3) {
          await this.drawCard(game, player, 3);
        } else {
          player.power += 2;
        }
        break;

      case CardProperty.DiscardAllCards:
        player.discard.push(...player.hand);
        player.hand = [];
        break;

      case CardProperty.PutNextBuyingCardOnTopOfDeck:
        player.putNextCardOnTopOfDeck = true;
        break;

      case CardProperty.YouAndSelectedEnemyDrawOneCard:
        await this.drawCard(game, player, 1);
        if (opponentId) {
          const opponent = game.gameState.players.find(
            (p) => p.id === opponentId,
          );
          if (opponent) {
            await this.drawCard(game, opponent, 1);
          }
        }
        break;

      case CardProperty.CanDestroyCardFromDiscard:
        if (player.discard.length > 0) {
          this.gameGateway.emitSelectionRequired(game.id, player.userId, {
            type: 'destroyCardFromDiscard',
            cards: player.discard,
          });
        }
        break;

      case CardProperty.CheckTopDeckCardRemoveGetOrHer:
        if (player.deck.length > 0) {
          const topCard = player.deck[0];
          this.gameGateway.emitSelectionRequired(game.id, player.userId, {
            type: 'checkTopDeckCard',
            card: topCard,
            actions: ['take', 'remove'],
          });
        }
        break;

      case CardProperty.CheckTopCardOfHisDeck:
        if (player.deck.length > 0) {
          const topCard = player.deck[0];
          this.gameGateway.emitSelectionRequired(game.id, player.userId, {
            type: 'viewTopDeckCard',
            card: topCard,
          });
        }
        break;

      case CardProperty.DrawOneCardOrReturnToDeck:
        if (player.deck.length > 0) {
          const topCard = player.deck[0];
          this.gameGateway.emitSelectionRequired(game.id, player.userId, {
            type: 'drawOrReturn',
            card: topCard,
            actions: ['draw', 'return'],
          });
        }
        break;

      case CardProperty.DrawAnyWizardCardFromDiscardOfAddTwoPower:
      case CardProperty.DrawAnyCreatureCardFromDiscardOfAddTwoPower:
      case CardProperty.DrawAnySpellCardFromDiscardOfAddTwoPower:
      case CardProperty.DrawAnyTreasureCardFromDiscardOfAddTwoPower:
        const cardType = property.match(
          /Wizard|Creature|Spell|Treasure/,
        )?.[0] as CardType;
        const cardToDraw = player.discard.find(
          (card) => card.type === cardType,
        );
        if (cardToDraw) {
          player.hand.push(cardToDraw);
          player.discard = player.discard.filter(
            (card) => card.id !== cardToDraw.id,
          );
        } else {
          player.power += 2;
        }
        break;

      case CardProperty.EachTimeYouGetOrBuyCardInTernPlayAttack:
        player.playAttackOnGetOrBuy = true;
        break;

      //place properties
      case CardProperty.IfHaveFirstWizardDrawOneCard:
        // Пассивное свойство: срабатывает автоматически при разыгрывании первого волшебника за ход
        // Реализация триггера находится в методе applyCardProperties после обработки всех свойств
        break;

      case CardProperty.IfHaveFirstCreatureDrawOneCard:
        // Пассивное свойство: срабатывает автоматически при разыгрывании первой твари за ход
        // Реализация триггера находится в методе applyCardProperties
        break;

      case CardProperty.IfHaveFirstTreasureDrawOneCard:
        // Пассивное свойство: срабатывает автоматически при разыгрывании первого сокровища за ход
        // Реализация триггера находится в методе applyCardProperties
        break;

      case CardProperty.IfHaveFirstSpellDrawOneCard:
        // Пассивное свойство: срабатывает автоматически при разыгрывании первого заклинания за ход
        // Реализация триггера находится в методе applyCardProperties
        break;

      case CardProperty.DoubleHealingEffects:
        // TODO: Пассивное свойство для Шестёрочки - удваивает эффекты накручивания (лечения)
        // Пока не реализовано, так как механика накручивания ещё не добавлена в игру
        break;

      case CardProperty.DoubleAttackDamage:
        // Пассивное свойство для Арены крутагидона - удваивает урон атак
        // Реализация находится в методе dealDamage()
        // Дополнительная логика сброса карты при убийстве врага находится в handlePlayerDeath()
        break;

      default:
        console.warn(`Необработанное свойство: ${property}`);
        break;
    }
  }

  async applyAttackProperty(
    game: Game,
    property: CardAttackProperty,
    player: Player,
    opponent: Player | null,
  ): Promise<void> {
    const gameState = game.gameState;

    switch (property) {
      case CardAttackProperty.DealOneDamageToSelectedEnemy:
        if (opponent) {
          this.dealDamage(gameState, opponent, 1, player);
        }
        break;

      case CardAttackProperty.DealThreeDamageToSelectedEnemy:
        if (opponent) {
          this.dealDamage(gameState, opponent, 3, player);
        }
        break;

      case CardAttackProperty.DealFiveDamageToSelectedEnemy:
        if (opponent) {
          this.dealDamage(gameState, opponent, 5, player);
        }
        break;

      case CardAttackProperty.DealTenDamageToSelectedEnemy:
        if (opponent) {
          this.dealDamage(gameState, opponent, 10, player);
        }
        break;

      case CardAttackProperty.DealTwoDamageToSelectedEnemyForEveryDefenseCardInDiscard:
        if (opponent) {
          const defenseCardCount = this.countDefenseCardsInDiscard(
            opponent.discard,
          );
          const damage = 2 * defenseCardCount;
          this.dealDamage(gameState, opponent, damage, player);
        }
        break;

      case CardAttackProperty.DealSevenDamageToEachEnemy:
        const enemies = this.getAliveEnemies(gameState, player);
        enemies.forEach((enemy) =>
          this.dealDamage(gameState, enemy, 7, player),
        );
        break;

      case CardAttackProperty.DealFiveDamageToLeftAndRightEnemy:
        const [leftEnemyFive, rightEnemyFive] = this.getLeftAndRightEnemies(
          gameState,
          player,
        );
        if (leftEnemyFive) this.dealDamage(gameState, leftEnemyFive, 5, player);
        if (rightEnemyFive)
          this.dealDamage(gameState, rightEnemyFive, 5, player);
        break;

      case CardAttackProperty.DealSixDamageToLeftAndRightEnemy:
        const [leftEnemySix, rightEnemySix] = this.getLeftAndRightEnemies(
          gameState,
          player,
        );
        if (leftEnemySix) this.dealDamage(gameState, leftEnemySix, 6, player);
        if (rightEnemySix) this.dealDamage(gameState, rightEnemySix, 6, player);
        break;

      case CardAttackProperty.DealFiveDamageToEachEnemyWeakerThanYou:
        const enemiesWeaker = this.getAliveEnemies(gameState, player).filter(
          (enemy) => enemy.health < player.health,
        );
        enemiesWeaker.forEach((enemy) =>
          this.dealDamage(gameState, enemy, 5, player),
        );
        break;

      case CardAttackProperty.EnemyGetSluggishStick:
        if (opponent) {
          this.addSluggishStick(gameState, opponent);
        }
        break;

      case CardAttackProperty.EveryEnemyGetsSluggishStick:
        const enemiesForSluggish = this.getAliveEnemies(gameState, player);
        enemiesForSluggish.forEach((enemy) =>
          this.addSluggishStick(gameState, enemy),
        );
        break;

      case CardAttackProperty.EveryEnemyDiscardOneCard:
        const enemiesToDiscard = this.getAliveEnemies(gameState, player);
        enemiesToDiscard.forEach((enemy) => {
          if (enemy.hand.length > 0) {
            const cardToDiscard = enemy.hand[0];
            enemy.hand = enemy.hand.slice(1);
            enemy.discard.push(cardToDiscard);
          }
        });
        break;

      case CardAttackProperty.EveryEnemyExpandTopCardOfTheirDeckYouCanDiscardThem:
        const enemiesToReveal = this.getAliveEnemies(gameState, player);
        const revealedCards: { enemyId: number; card: Card }[] = [];
        enemiesToReveal.forEach((enemy) => {
          if (enemy.deck.length > 0) {
            const topCard = enemy.deck[0];
            revealedCards.push({ enemyId: enemy.id, card: topCard });
          }
        });
        if (revealedCards.length > 0) {
          this.gameGateway.emitTopDeckReveal(
            game.id.toString(),
            player.userId,
            revealedCards,
          );
          gameState.pendingTopDeckSelection = {
            playerId: player.id,
            revealedCards,
          };
        }
        break;

      case CardAttackProperty.SelectedEnemyDiscardOneCardOfCostOverFiveIfEnemyEscapeAttackDealFiveDamage:
        if (opponent) {
          const costlyCard = opponent.hand.find((card) => card.cost > 5);
          if (costlyCard) {
            opponent.hand = opponent.hand.filter(
              (card) => card.id !== costlyCard.id,
            );
            opponent.discard.push(costlyCard);
          }
        }
        break;

      case CardAttackProperty.SelectedEnemyExpandTopCardOfHisDeckDealDamageAsItCost:
        if (opponent && opponent.deck.length > 0) {
          const topCard = opponent.deck[0];
          const damage = topCard.cost || 0;
          this.dealDamage(gameState, opponent, damage, player);
          this.gameGateway.emitTopCardRevealed(
            game.id.toString(),
            opponent.userId,
            topCard,
          );
        }
        break;

      case CardAttackProperty.DealThreeDamageToEveryEnemyForEveryPermanentCard:
        const permanentCardCount = this.countPermanentCards(player.playArea);
        const damagePerEnemy = 3 * permanentCardCount;
        const enemiesForPermanent = this.getAliveEnemies(gameState, player);
        enemiesForPermanent.forEach((enemy) =>
          this.dealDamage(gameState, enemy, damagePerEnemy, player),
        );
        break;

      case CardAttackProperty.SelectedEnemyExpandEveryCardOfHisHandDealDamageAsCostOfMostCostly:
        if (opponent && opponent.hand.length > 0) {
          const mostCostlyCard = opponent.hand.reduce((max, card) =>
            card.cost > max.cost ? card : max,
          );
          const damage = mostCostlyCard.cost || 0;
          this.dealDamage(gameState, opponent, damage, player);
          this.gameGateway.emitHandRevealed(
            game.id.toString(),
            opponent.userId,
            opponent.hand,
          );
        }
        break;

      case CardAttackProperty.GiveCardWithCostZeroFromHandOrDiscardToSelectedEnemyHand:
        if (opponent) {
          const zeroCostCard = [...player.hand, ...player.discard].find(
            (card) => card.cost === 0,
          );
          if (zeroCostCard) {
            const removedCard = this.removeCardFromHandOrDiscard(
              player,
              zeroCostCard.id,
            );
            if (removedCard) {
              this.addCardToHand(opponent, removedCard);
            }
          }
        }
        break;

      case CardAttackProperty.DealTwoDamageEveryEnemyForEverySluggishStickInControlAndDiscardIfNoDamageDrawOneCard:
        const sluggishStickCount = this.countSluggishSticks(
          player.playArea,
          player.discard,
        );
        const damagePerEnemySluggish = 2 * sluggishStickCount;
        const enemiesForSluggishDamage = this.getAliveEnemies(
          gameState,
          player,
        );
        enemiesForSluggishDamage.forEach((enemy) =>
          this.dealDamage(gameState, enemy, damagePerEnemySluggish, player),
        );
        if (damagePerEnemySluggish === 0 && player.deck.length > 0) {
          await this.drawCard(game, player, 1);
        }
        break;

      case CardAttackProperty.DealFourDamageEveryEnemyForEveryLegendInEnemyDiscardIfNoDamageCanDestroyCardInHand:
        let totalDamageDealt = 0;
        const enemiesForLegendDamage = this.getAliveEnemies(gameState, player);
        enemiesForLegendDamage.forEach((enemy) => {
          const legendCount = this.countLegendsInDiscard(enemy.discard);
          const damage = 4 * legendCount;
          totalDamageDealt += damage;
          this.dealDamage(gameState, enemy, damage, player);
        });
        if (totalDamageDealt === 0 && player.hand.length > 0) {
          this.gameGateway.emitDestroyCardRequired(
            game.id.toString(),
            player.userId,
            player.hand.map((card) => card.id),
          );
          gameState.pendingDestroyCardSelection = {
            playerId: player.id,
            source: 'hand',
          };
        }
        break;

      case CardAttackProperty.DealFourDamageWeakestEnemyIfHisDieNestingTwoDeadWizardSelectOneAndGiveToEnemy:
        const enemiesForWeakest = this.getAliveEnemies(gameState, player);
        const weakestEnemy = this.getWeakestEnemy(enemiesForWeakest);
        if (weakestEnemy) {
          const initialHealth = weakestEnemy.health;
          this.dealDamage(gameState, weakestEnemy, 4, player);
          if (
            initialHealth > 0 &&
            weakestEnemy.health <= 0 &&
            gameState.deadWizardTokens >= 2
          ) {
            player.deadWizardCount += 2;
            gameState.deadWizardTokens -= 2;
            const enemiesToGiveWizard = this.getAliveEnemies(gameState, player);
            if (enemiesToGiveWizard.length > 0) {
              this.gameGateway.emitSelectEnemyRequired(
                game.id.toString(),
                player.userId,
                enemiesToGiveWizard.map((enemy) => enemy.id),
                'giveDeadWizard',
              );
              gameState.pendingEnemySelection = {
                playerId: player.id,
                action: 'giveDeadWizard',
                targets: enemiesToGiveWizard.map((enemy) => enemy.id),
              };
            }
          }
        }
        break;

      case CardAttackProperty.DealToSelectedEnemyDamageAsCostBoughtOrGotCard:
        if (opponent && gameState.lastBoughtOrGotCardCost !== undefined) {
          const damage = gameState.lastBoughtOrGotCardCost;
          this.dealDamage(gameState, opponent, damage, player);
        }
        break;

      default:
        console.warn(`Необработанное атакующее свойство: ${property}`);
        break;
    }
  }

  applyDefenseProperty(property: CardDefenseProperty, player: Player): void {
    switch (property) {
      case CardDefenseProperty.GainThreeHealth:
        player.health = Math.min(player.health + 3, player.maxHealth);
        break;
      default:
        break;
    }
  }

  applyDefenseCard(
    game: Game,
    card: Card,
    defender: Player,
    attacker: Player | null,
  ): void {
    for (const property of card.defenseProperties) {
      this.applyDefenseProperty(property, defender);
    }
  }

  handlePlayerDeath(
    gameState: GameState,
    deadPlayer: Player,
    killer: Player | null,
  ): void {
    deadPlayer.health = 20;
    deadPlayer.deadWizardCount += 1;

    if (gameState.deadWizardTokens > 0) {
      gameState.deadWizardTokens -= 1;
      const newDeadWizard: DeadWizard = {
        id: deadPlayer.deadWizardCount,
        name: `Dead Wizard ${deadPlayer.deadWizardCount}`,
        imageUrl: '',
        properties: [],
      };
      deadPlayer.deadWizards.push(newDeadWizard);

      for (const property of newDeadWizard.properties) {
        if (property === 'resurrectWith11Health') {
          deadPlayer.health = 11;
        }
      }
    }

    if (gameState.krutagidonPrize && deadPlayer !== killer) {
      gameState.krutagidonPrize.owner = killer;
    }

    // Арена крутагидона: при убийстве врага сбрасывается в сброс
    if (killer) {
      const arenaIndex = killer.playArea.findIndex(
        (card) =>
          card.name === 'Арена крутагидона' &&
          card.properties.includes(CardProperty.DoubleAttackDamage),
      );

      if (arenaIndex !== -1) {
        const arenaCard = killer.playArea[arenaIndex];
        killer.playArea.splice(arenaIndex, 1);
        killer.discard.push(arenaCard);
      }
    }
  }

  applyWizardPropertyTokenEffect(
    gameState: GameState,
    player: Player,
    trigger: 'playCard' | 'endTurn' | 'buyCard',
    card?: Card,
  ): void {
    if (!player.wizardPropertyToken) return;
    // Реализация эффектов жетонов свойств
  }
}
