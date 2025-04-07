import { Card } from 'src/game/entities/card.entity';
import { CardType } from 'src/game/types';

const strayMagic = {
  name: 'Шальная магия',
  effect: '',
  properties: [],
  attackProperties: [],
  defenseProperties: [],
  cost: 3,
  damage: 0,
  power: 0,
  imageUrl: '/IMG_8157_processed.png',
  isAttack: false,
  isDefense: false,
  victoryPoints: 1,
  type: CardType.StrayMagic,
};

const sluggishStick = {
  name: 'Вялая палочка',
  effect: '',
  properties: [],
  attackProperties: [],
  defenseProperties: [],
  cost: 0,
  damage: 0,
  power: 0,
  imageUrl: '/IMG_8156_processed.png',
  isAttack: false,
  isDefense: false,
  victoryPoints: -1,
  type: CardType.SluggishStick,
};

export const getNotTypeCards = () => {
  const deck: Partial<Card>[] = [];
  for (let i = 0; i < 16; i++) {
    deck.push(strayMagic);
  }
  for (let i = 0; i < 16; i++) {
    deck.push(sluggishStick);
  }
  return deck;
};
