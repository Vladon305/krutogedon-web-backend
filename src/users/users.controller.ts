import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Получение данных текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    type: Object,
  })
  @ApiResponse({
    status: 401,
    description: 'Токен отсутствует или недействителен',
  })
  async getMe(@Request() req) {
    const user = await this.usersService.findOneById(req.user.id);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }
}
