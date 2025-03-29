import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @ApiProperty({ description: 'ID пользователя', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Имя пользователя', example: 'user1' })
  @Column({ unique: true })
  username: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'user1@example.com',
  })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'Хешированный пароль', example: '$2a$10$...' })
  @Column()
  password: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;
}
