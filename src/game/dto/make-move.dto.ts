import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject } from 'class-validator';

export class MakeMoveDto {
  @ApiProperty({ description: 'ID игры', example: 1 })
  @IsInt()
  gameId: number;

  @ApiProperty({
    description: 'Данные хода',
    example: { card: 'Ace of Spades' },
  })
  @IsObject()
  move: {
    type: 'play-card' | 'end-turn' | 'attack' | 'buy-card';
    cardId?: number;
    targetId?: number;
    damage?: number;
    marketplaceIndex?: number;
    isLegendary?: boolean;
  };
}
