import { Card } from 'src/game/entities/card.entity';
import { CardAttackProperty, CardProperty, CardType } from 'src/game/types';

const sign = {
  name: 'Знак',
  cost: 0,
  effect: '+ 1 мощь',
  properties: [CardProperty.AddOnePower],
  attackProperties: [],
  defenseProperties: [],
  damage: 0,
  power: 1,
  imageUrl: '/seed/IMG_8152_processed.png',
  isAttack: false,
  isDefense: false,
  victoryPoints: 0,
  type: CardType.Seed,
};
const stick = {
  name: 'Палочка',
  cost: 0,
  effect: 'Наносит 1 урон врагу',
  properties: [CardProperty.AddOnePower],
  attackProperties: [CardAttackProperty.DealOneDamageToSelectedEnemy],
  defenseProperties: [],
  damage: 1,
  power: 1,
  imageUrl: '/seed/IMG_8155_processed.png',
  isAttack: true,
  isDefense: false,
  victoryPoints: 0,
  type: CardType.Seed,
};
const spike = {
  name: 'Пшик',
  cost: 0,
  effect: 'Ничего не делает',
  properties: [],
  attackProperties: [],
  defenseProperties: [],
  damage: 0,
  power: 0,
  imageUrl: '/seed/IMG_8154_processed.png',
  isAttack: false,
  isDefense: false,
  victoryPoints: 0,
  type: CardType.Seed,
};

export const getSeed = () => {
  const seed: Partial<Card>[] = [];
  for (let i = 0; i < 30; i++) {
    seed.push(sign);
  }
  for (let i = 0; i < 15; i++) {
    seed.push(spike);
  }
  for (let i = 0; i < 5; i++) {
    seed.push(stick);
  }
  return seed;
};
