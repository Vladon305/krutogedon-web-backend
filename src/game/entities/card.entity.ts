import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Game } from './game.entity';
import {
  CardAttackProperty,
  CardDefenseProperty,
  CardProperty,
  CardType,
} from '../types';

@Entity()
export class Card {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  cost: number;

  @Column()
  effect?: string;

  @Column('simple-array')
  properties: CardProperty[];

  @Column('simple-array')
  attackProperties: CardAttackProperty[];

  @Column('simple-array')
  defenseProperties: CardDefenseProperty[];

  @Column({ type: 'int', nullable: true })
  damage?: number | null;

  @Column({ type: 'int', nullable: true })
  power?: number;

  @Column()
  imageUrl: string;

  @Column()
  isAttack: boolean;

  @Column()
  isDefense: boolean;

  @Column({ default: true, type: 'boolean' })
  isSingleCard: boolean;

  @Column({ default: false, type: 'boolean' })
  isPermanent: boolean;

  @Column()
  victoryPoints: number;

  @Column({ type: 'simple-array', nullable: true })
  groupAttack?: string[];

  // Добавляем новое поле type с перечислением
  @Column({
    type: 'enum',
    enum: CardType,
    default: CardType.Seed, // Значение по умолчанию
  })
  type: CardType;

  @ManyToOne(() => Game, (game) => game.cards, { nullable: true })
  game?: Game; // Карта может быть связана с игрой (опционально)
}
