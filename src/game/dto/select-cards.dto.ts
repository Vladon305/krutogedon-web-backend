import { IsObject, IsString } from 'class-validator';

export class SelectCardsDto {
  @IsString()
  playerId: string;

  @IsObject()
  selectedCards: { property: any; familiar: any; playerArea: any };
}
