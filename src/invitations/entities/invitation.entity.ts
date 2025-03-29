import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { LobbyPlayer } from './lobby-player.entity';

@Entity()
export class Invitation {
  @ApiProperty({ description: 'ID приглашения', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Отправитель приглашения' })
  @ManyToOne(() => User)
  sender: User;

  @ApiProperty({ description: 'Получатели приглашения' })
  @ManyToMany(() => User)
  @JoinTable()
  receivers: User[];

  @ApiProperty({ description: 'Статус приглашения', example: 'pending' })
  @Column()
  status: 'pending' | 'accepted' | 'declined';

  @ApiProperty({
    description: 'Уникальный токен для приглашения',
    example: 'abc123',
  })
  @Column({ nullable: true })
  token: string;

  @ApiProperty({ description: 'ID созданной игры', example: 1 })
  @Column({ nullable: true })
  gameId: number;

  @ApiProperty({ description: 'Игроки в лобби' })
  @OneToMany(() => LobbyPlayer, (lobbyPlayer) => lobbyPlayer.invitation)
  lobbyPlayers: LobbyPlayer[];
}
