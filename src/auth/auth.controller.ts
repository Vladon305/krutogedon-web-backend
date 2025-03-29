import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь зарегистрирован',
    type: Object,
  })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким именем или email уже существует',
  })
  async register(
    @Body('username') username: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.register(username, email, password);
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный вход', type: Object })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(
    @Body('identifier') identifier: string,
    @Body('password') password: string,
    @Request() req,
  ) {
    const user = await this.authService.validateUser(identifier, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user);
    // Устанавливаем refreshToken в HTTP-only cookie
    req.res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // В продакшене должен быть true
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    });
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('refresh')
  @ApiOperation({ summary: 'Обновление accessToken с помощью refreshToken' })
  @ApiResponse({ status: 200, description: 'Токен обновлён', type: Object })
  @ApiResponse({ status: 401, description: 'Недействительный refreshToken' })
  async refresh(@Request() req) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    return this.authService.refreshToken(req.user.id, refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Выход пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    req.res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }
}
