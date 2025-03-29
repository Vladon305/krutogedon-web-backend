import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your_jwt_secret', // Замените на свой секретный ключ
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOneByIdentifier(payload.username);
    if (!user) {
      return null;
    }
    return { id: user.id, username: user.username };
  }
}
