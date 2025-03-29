import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async create(@Request() req) {
    return this.invitationsService.create(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('lobby/:id')
  async getLobby(@Request() req, @Param('id') id: number) {
    return this.invitationsService.getLobby(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('join-by-token')
  async joinLobbyByToken(@Request() req, @Query('token') token: string) {
    return this.invitationsService.joinLobbyByToken(token, req.user.id);
  }

  // Добавляем новый маршрут для set-ready
  @UseGuards(AuthGuard('jwt'))
  @Post('set-ready')
  async setReady(
    @Request() req,
    @Body() body: { invitationId: number; userId: number },
  ) {
    const { invitationId, userId } = body;
    if (req.user.id !== userId) {
      throw new BadRequestException(
        'Вы можете изменить статус готовности только для себя',
      );
    }
    await this.invitationsService.setReady(invitationId, userId);
    return { message: 'Статус готовности обновлён' };
  }
}
