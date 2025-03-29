import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Имя пользователя', example: 'user1' })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Email пользователя',
    example: 'user1@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Пароль', example: 'pass123' })
  @IsString()
  @MinLength(6)
  password: string;
}
