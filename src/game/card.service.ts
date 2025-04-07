import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card, CardType } from './types';
import { Card as CardEntity } from './entities/card.entity';

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(CardEntity)
    private cardRepository: Repository<CardEntity>,
  ) {}

  async getCardsByNames(names: string[]): Promise<Card[]> {
    const cardEntities = await this.cardRepository.find({
      where: names.map((name) => ({ name })),
    });
    return cardEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      cost: entity.cost,
      effect: entity.effect,
      properties: entity.properties,
      attackProperties: entity.attackProperties,
      defenseProperties: entity.defenseProperties,
      imageUrl: entity.imageUrl,
      damage: entity.damage,
      isAttack: entity.isAttack,
      isDefense: entity.isDefense,
      victoryPoints: entity.victoryPoints,
      type: entity.type,
      isPermanent: entity.isPermanent,
      isSingleCard: entity.isSingleCard,
    }));
  }

  async getCardsByType(type: CardType): Promise<Card[]> {
    const cardEntities = await this.cardRepository.find({
      where: { type },
    });
    return cardEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      cost: entity.cost,
      effect: entity.effect,
      properties: entity.properties,
      attackProperties: entity.attackProperties,
      defenseProperties: entity.defenseProperties,
      imageUrl: entity.imageUrl,
      damage: entity.damage,
      isAttack: entity.isAttack,
      isDefense: entity.isDefense,
      victoryPoints: entity.victoryPoints,
      type: entity.type,
      isPermanent: entity.isPermanent,
      isSingleCard: entity.isSingleCard,
    }));
  }

  async initializeDeck(): Promise<Card[]> {
    const cards = await this.getCardsByType(CardType.Seed);
    const deck: Card[] = [];

    const signs = cards.filter((c) => c.name === 'Знак');
    const stick = cards.find((c) => c.name === 'Палочка');
    const spikes = cards.filter((c) => c.name === 'Пшик');

    if (!signs || !stick || !spikes) {
      throw new Error('Seed card "Знак" not found');
    }
    // Add 6 signs
    for (let i = 0; i < 6; i++) {
      deck.push(signs[i]);
    }

    // Add 1 cheese stick
    deck.push(stick);

    // Add 3 spikes
    for (let i = 0; i < 3; i++) {
      deck.push(spikes[i]);
    }
    return deck;
  }

  async initializeMarketplace(): Promise<Card[]> {
    const creature = await this.getCardsByType(CardType.Creature);
    const place = await this.getCardsByType(CardType.Place);
    const spell = await this.getCardsByType(CardType.Spell);
    const treasure = await this.getCardsByType(CardType.Treasure);
    const wizard = await this.getCardsByType(CardType.Wizard);
    const chaosCards = await this.getCardsByType(CardType.ChaosCard);

    return [
      ...creature,
      ...place,
      ...spell,
      ...treasure,
      ...wizard,
      ...chaosCards,
    ];
  }

  async initializeLegendaryMarketplace(): Promise<Card[]> {
    const cards = await this.getCardsByType(CardType.Legend);
    return cards;
  }

  shuffleDeck<T = Card>(deck: T[]): T[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
}
