import { Injectable } from '@nestjs/common';
import { Card, CardType, Game, GameState, Player } from './types';
import { PlayerService } from './player.service';

@Injectable()
export class TurnService {
  constructor(private readonly playerService: PlayerService) {}

  applyStartOfTurnEffects(gameState: GameState, player: Player) {
    // Сброс флагов для постоянных карт (мест)
    player.firstWizardPlayedThisTurn = false;
    player.firstCreaturePlayedThisTurn = false;
    player.firstTreasurePlayedThisTurn = false;
    player.firstSpellPlayedThisTurn = false;

    player.playArea.forEach((card) => {
      if (card.effect?.startsWith('в начале хода')) {
        if (card.effect === 'в начале хода: добавить 1 мощь') {
          player.power += 1;
        }
      }
    });
  }

  applyEndOfTurnEffects(game: Game, player: Player) {
    player.playArea.forEach((card) => {
      if (card.effect?.startsWith('в конце хода')) {
        if (card.effect === 'в конце хода: взять 1 карту') {
          this.playerService.drawCard(game, player);
        }
      }
    });
  }

  applyStrayMagicEffect(game: Game, card: Card, player: Player) {
    if (card.effect === 'Каждый игрок берет 1 карту') {
      game.gameState.players.forEach((p) => {
        this.playerService.drawCard(game, p);
      });
    }
  }

  applyLegendaryGroupAttack(game: Game, legend: Card) {
    game.gameState.players.forEach((player) => {
      const defenseCard = player.hand.find((c) => c.isDefense);
      let attackApplied = true;

      if (defenseCard) {
        this.playerService.applyDefenseCard(game, defenseCard, player, null);
        player.hand = player.hand.filter((c) => c.id !== defenseCard.id);
        player.playArea.push(defenseCard);
        if (defenseCard.isDefense) {
          attackApplied = false;
        }
      }

      if (attackApplied && legend.effect) {
        if (
          legend.effect ===
          'Групповая атака: каждый колдун отхватывает 5 урона и получает вялую палочку'
        ) {
          player.health -= 5;
          if (player.health < 1) {
            this.playerService.handlePlayerDeath(game.gameState, player, null);
          }
          if (game.gameState.sluggishSticksDeck.length > 0) {
            const sluggishStick = game.gameState.sluggishSticksDeck.shift();
            if (sluggishStick) {
              player.discard.push(sluggishStick);
            }
          }
        }
      }
    });
  }
}
