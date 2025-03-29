import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateGameDto {
  @ApiProperty({ description: 'ID приглашения', example: 1 })
  @IsInt()
  invitationId: number;
}
