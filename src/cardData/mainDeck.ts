import { Card } from 'src/game/entities/card.entity';
import {
  CardAttackProperty,
  CardDefenseProperty,
  CardProperty,
  CardType,
} from 'src/game/types';

export const mainDeck: Partial<Card>[] = [
  {
    name: 'Солнцеликий',
    effect: '',
    properties: [CardProperty.AddTwoPower, CardProperty.DrawOneCard],
    attackProperties: [CardAttackProperty.DealTenDamageToSelectedEnemy],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8179_processed.png',
    cost: 7,
    damage: 10,
    power: 2,
    victoryPoints: 2,
    isAttack: true,
    isDefense: false,
    type: CardType.Wizard,
  },
  {
    name: 'Крутагидон!',
    effect: '',
    properties: [CardProperty.AddThreePower],
    attackProperties: [CardAttackProperty.DealSevenDamageToEachEnemy],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8180_processed.png',
    cost: 7,
    damage: 0,
    power: 3,
    victoryPoints: 2,
    isAttack: true,
    isDefense: false,
    type: CardType.Spell,
  },
  {
    name: 'Сладкий котик',
    effect: '',
    properties: [],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8181_processed.png',
    cost: 6,
    damage: 0,
    power: 0,
    victoryPoints: 2,
    isAttack: false,
    isDefense: false,
    type: CardType.Wizard,
  },
  {
    name: 'Некромантика',
    effect: '',
    properties: [CardProperty.AddThreePower, CardProperty.Necromancy],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8182_processed.png',
    cost: 6,
    damage: 0,
    power: 3,
    victoryPoints: 2,
    isAttack: false,
    isDefense: false,
    type: CardType.Spell,
  },
  {
    name: 'Фруктовый зад',
    effect: '',
    properties: [CardProperty.AddTwoPower],
    attackProperties: [
      CardAttackProperty.EveryEnemyGetsSluggishStick,
      CardAttackProperty.ForEveryEnemyThatEscapesAttackGainFourHealth,
    ],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8183_processed.png',
    cost: 6,
    damage: 0,
    power: 2,
    victoryPoints: 2,
    isAttack: true,
    isDefense: false,
    type: CardType.Creature,
  },
  {
    name: 'Большой костец',
    effect: '',
    properties: [CardProperty.CardLikeDeadWizard],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8184_processed.png',
    cost: 3,
    damage: 0,
    power: 0,
    victoryPoints: 0,
    isAttack: false,
    isDefense: false,
    isPermanent: true,
    type: CardType.Treasure,
  },
  {
    name: 'Сумка радости',
    effect: '',
    properties: [
      CardProperty.AddThreePower,
      CardProperty.ExpandTopDeckCardAndGainLivesAsItCost,
    ],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8185_processed.png',
    cost: 6,
    damage: 0,
    power: 3,
    victoryPoints: 2,
    isAttack: false,
    isDefense: false,
    type: CardType.Treasure,
  },
  {
    name: 'Лавры дядюшки энди',
    effect: '',
    properties: [CardProperty.AddFivePower],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8186_processed.png',
    cost: 7,
    damage: 0,
    power: 5,
    victoryPoints: 2,
    isAttack: false,
    isDefense: false,
    type: CardType.Treasure,
  },
  {
    name: 'Угорилла',
    effect: '',
    properties: [CardProperty.AddTwoPower],
    attackProperties: [],
    defenseProperties: [
      CardDefenseProperty.DiscardCard,
      CardDefenseProperty.DrawOneCard,
      CardDefenseProperty.CanDestroyCardInHand,
    ],
    imageUrl: '/mainDeck/single/IMG_8187_processed.png',
    cost: 6,
    damage: 0,
    power: 2,
    victoryPoints: 2,
    isAttack: false,
    isDefense: true,
    type: CardType.Creature,
  },
  {
    name: 'Распальцун',
    effect: '',
    properties: [
      CardProperty.AddFivePower,
      CardProperty.RemoveOnePowerForEachDeadWizard,
    ],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8188_processed.png',
    cost: 6,
    damage: 0,
    power: 0,
    victoryPoints: 3,
    isAttack: false,
    isDefense: false,
    type: CardType.Wizard,
  },
  {
    name: 'Нечестивый грааль',
    effect: '',
    properties: [CardProperty.AddThreePower],
    attackProperties: [],
    defenseProperties: [
      CardDefenseProperty.DiscardCard,
      CardDefenseProperty.DrawOneCard,
      CardDefenseProperty.DealFiveDamageToAttackerEnemy,
    ],
    imageUrl: '/mainDeck/single/IMG_8189_processed.png',
    cost: 6,
    damage: 0,
    power: 3,
    victoryPoints: 2,
    isAttack: false,
    isDefense: true,
    type: CardType.Treasure,
  },
  {
    name: 'Ктулху',
    effect: '',
    properties: [CardProperty.Cthulhu],
    attackProperties: [],
    defenseProperties: [],
    imageUrl: '/mainDeck/single/IMG_8190_processed.png',
    cost: 7,
    damage: 0,
    power: 0,
    victoryPoints: 3,
    isAttack: false,
    isDefense: false,
    type: CardType.Creature,
  },
  {
    name: 'Драконьи яйца',
    effect: '',
    properties: [CardProperty.GainThreeHealth],
    attackProperties: [],
    defenseProperties: [
      CardDefenseProperty.DiscardCard,
      CardDefenseProperty.DrawOneCard,
    ],
    imageUrl: '/mainDeck/single/IMG_8191_processed.png',
    cost: 5,
    damage: 0,
    power: 0,
    victoryPoints: 0,
    isAttack: false,
    isDefense: true,
    isPermanent: true,
    type: CardType.Creature,
  },
];
