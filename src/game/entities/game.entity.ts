import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Card } from './card.entity';
import { Move } from './move.entity';
import { GameState } from '../types';

@Entity()
export class Game {
  @ApiProperty({ description: 'ID игры', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Игроки' })
  @ManyToMany(() => User)
  @JoinTable()
  players: User[];

  @ApiProperty({
    description: 'Состояние игры',
    example: { lastMove: { card: 'Ace of Spades' } },
  })
  @Column({ type: 'json', nullable: true })
  gameState: GameState;

  @ApiProperty({ description: 'ID игрока, чей ход', example: 1 })
  @Column()
  currentTurn: number;

  @ApiProperty({ description: 'Индекс текущего игрока', example: 0 })
  @Column({ default: 0 })
  currentTurnIndex: number;

  @ApiProperty({ description: 'Статус игры', example: 'pending' })
  @Column({ default: 'pending' })
  status: 'pending' | 'active' | 'finished';

  @ApiProperty({ description: 'Победитель игры', example: 1, nullable: true })
  @ManyToOne(() => User, { nullable: true })
  winner: User;

  @OneToMany(() => Move, (move) => move.game)
  moves: Move[];

  @OneToMany(() => Card, (card) => card.game)
  cards: Card[];
}
