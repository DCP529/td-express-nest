import {HttpException, HttpStatus, Injectable, UnauthorizedException} from "@nestjs/common";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { UsersService } from "../users/users.service";
import * as bcrypt from 'bcryptjs'
import { EnterUserDto } from "../users/dto/enter-user.dto";
import { TokensService } from "../tokens/tokens.service";
import { SheltersService } from "../shelters/shelters.service";
import {JwtService} from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private userService: UsersService,
              private tokensService: TokensService,
              private shelterService: SheltersService,
              private jwtService: JwtService) {
  }

  async login(userDto: EnterUserDto) {
    return await this.validateUser(userDto)
  }

  async registration(userDto: CreateUserDto) {
    const candidate = await this.userService.getUserByEmail(userDto.email)
    if (candidate) {
      throw new HttpException(
        'Пользователь с таким email существет',
          HttpStatus.BAD_REQUEST
        )
    }
    const hashPassword = await bcrypt.hash(userDto.password, 5)
    return await this.userService.createUser({...userDto, password: hashPassword})
  }


  // async removeToken(refreshToken: string) {
  //   return await this.jwtService.de
  // }

  private async validateUser(userDto: CreateUserDto | EnterUserDto) {
    const user = await this.userService.getUserByEmail(userDto.email)
    if (!user) {
      throw new UnauthorizedException({message: 'Некорректный емайл или пароль'})
    }
    const passwordEquals = await bcrypt.compare(userDto?.password, user?.password)
    if (user && passwordEquals) {
      return user
    }
    throw new UnauthorizedException({message: 'Некорректный емайл или пароль'})
  }

  async logout(refreshToken: string) {
    return await this.tokensService.removeToken(refreshToken)
  }

  async checkEmail(userDto: { email: string }) {
    const check = await this.userService.getUserByEmail(userDto.email)
    return Boolean(check)
  }

  async refresh(refreshToken: string, param?: unknown) {
    if (!refreshToken) {
      throw new UnauthorizedException({message: 'Пользователь не авторизован'})
    }
    const userData = await this.tokensService.validateRefreshToken(refreshToken)
    const tokenFromDb = await this.tokensService.findToken(refreshToken)
    if (!userData || !tokenFromDb) {
      throw new UnauthorizedException({message: 'Пользователь не авторизован'})
    }
    let user
    let tokens
    if (!param) {
      user = await this.userService.getUserByEmail(userData.email)
      tokens = await this.tokensService.generateTokens({email: user.email, userId: user._id})
    } else {
      user = await this.shelterService.getShelterByEmail(userData.email)
      tokens = await this.tokensService.generateTokens({email: user.email, userId: user._id})
    }
    await this.tokensService.saveToken(user._id, tokens.refreshToken)
    return {...tokens, user}
  }

  createAccessToken(user) {
    const payload = { sub: user.id, email: user.email, user: 'user' };
    return this.jwtService.signAsync(payload);
  }

  async addTelegramShelter(dto: EnterUserDto) {
    const validationUser = await this.validateUser(dto)

    return await this.userService.addTelegramPush(validationUser, dto.chatId)
  }
}

