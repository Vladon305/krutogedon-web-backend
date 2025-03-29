import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Имя пользователя или email',
    example: 'user1 или user1@example.com',
  })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Пароль', example: 'pass123' })
  @IsString()
  @MinLength(6)
  password: string;
}
