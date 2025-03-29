import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsEmail, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Массив ID пользователей для приглашения',
    example: [2, 3, 4],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  receiverIds?: number[];

  @ApiProperty({
    description: 'Массив email-адресов для приглашения',
    example: ['user2@example.com', 'user3@example.com'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  invitedEmails?: string[];
}
