import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

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
  gameState: any;

  @ApiProperty({ description: 'ID игрока, чей ход', example: 1 })
  @Column()
  currentTurn: number;

  @ApiProperty({ description: 'Индекс текущего игрока', example: 0 })
  @Column({ default: 0 })
  currentTurnIndex: number;
}
