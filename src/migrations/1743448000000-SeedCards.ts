import { familiars } from 'src/cardData/familiars';
import { legend } from 'src/cardData/legend';
import { mainDeck } from 'src/cardData/mainDeck';
import { getMainDoubleDeck, mainDoubleDeck } from 'src/cardData/mainDoubleDeck';
import { getNotTypeCards } from 'src/cardData/notType';
import { place } from 'src/cardData/place';
import { getSeed } from 'src/cardData/seed';
import { Card } from 'src/game/entities/card.entity';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCards1743448000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const cardRepository = queryRunner.manager.getRepository(Card);

    const cards = [
      ...getSeed(),
      ...getMainDoubleDeck(),
      ...familiars,
      ...mainDeck,
      ...place,
      ...legend,
      ...getNotTypeCards(),
    ];
    await cardRepository.save(cards);
    console.log('Cards seeded successfully');

    // await queryRunner.query(`
    //         INSERT INTO "card" ("name", "cost", "attack", "life", "effect", "properties", "damage", "isAttack") VALUES
    //         ('Знак', 1, 0, 0, '+1 мощь', ARRAY[]::text[], 0, false),
    //         ('Палочка', 1, 1, 0, 'Атака: нанести 1 урон выбранному колдуну. Если он от этого подох, возьми 2 карты.', ARRAY[]::text[], 1, true),
    //         ('Пшик (Эффектная нем.)', 0, 0, 0, '(Эффектная нем.)', ARRAY[]::text[], 0, false);
    //       `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "card"`);
    console.log('Cards removed');
  }
}
