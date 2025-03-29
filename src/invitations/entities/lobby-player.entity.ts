import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { Invitation } from './invitation.entity';

@Entity()
export class LobbyPlayer {
  @ApiProperty({ description: 'ID записи', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Пользователь' })
  @ManyToOne(() => User)
  user: User;

  @ApiProperty({ description: 'Приглашение' })
  @ManyToOne(() => Invitation, (invitation) => invitation.id)
  invitation: Invitation;

  @ApiProperty({ description: 'Статус готовности', example: false })
  @Column({ default: false })
  ready: boolean;
}
