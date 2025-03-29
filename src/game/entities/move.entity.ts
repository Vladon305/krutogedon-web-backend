import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Game } from './game.entity';
import { User } from 'src/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Move {
  @ApiProperty({ description: 'ID хода', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Игра' })
  @ManyToOne(() => Game)
  game: Game;

  @ApiProperty({ description: 'Игрок, сделавший ход' })
  @ManyToOne(() => User)
  player: User;

  @ApiProperty({
    description: 'Данные хода',
    example: { card: 'Ace of Spades' },
  })
  @Column({ type: 'json' })
  moveData: any;

  @ApiProperty({
    description: 'Время хода',
    example: '2025-03-26T05:52:42.000Z',
  })
  @Column()
  timestamp: Date;
}
