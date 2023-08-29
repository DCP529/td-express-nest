import { Body, Controller, Post, Req, Res, UsePipes } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { EnterUserDto } from "../users/dto/enter-user.dto";
import { ValidationPipe } from "../pipes/validation.pipe";

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {
  }

  @ApiOperation({summary: 'Логин'})
  @ApiResponse({status: 200})
  @UsePipes(ValidationPipe)
  @Post('/login')
  async login(@Body() userDto: EnterUserDto,
        @Res({passthrough: true}) response: Response) {
    const user = await this.authService.login(userDto)
    const token = await this.authService.createAccessToken(user);
    response.cookie('access_token_user',
        token,
      {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: Boolean(process.env.HTTPS_BOOLEAN)})
    return {user, token}
  }

  @UsePipes(ValidationPipe)
  @Post('/registration')
  async registration(@Body() userDto: CreateUserDto,
               @Res({passthrough: true}) response: Response) {
    const user = await this.authService.registration(userDto)
    const token = await this.authService.createAccessToken(user);
    response.cookie('access_token_user',
        token,
      {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: Boolean(process.env.HTTPS_BOOLEAN)})
    return {user, token}
  }

  @UsePipes(ValidationPipe)
  @Post('/logout')
  async logout(@Body() userDto: CreateUserDto,
                     @Req() request: Request,
                     @Res() response: Response) {
    const {refreshToken} = request.cookies
    const token = await this.authService.logout(refreshToken)
    response.clearCookie('access_token_user')
    return response.json(token)
  }

  @UsePipes(ValidationPipe)
  @Post('/check')
  async checkEmail(@Body() userDto: {email: string}) {
    return await this.authService.checkEmail(userDto)
  }

  // @UsePipes(ValidationPipe)
  // @Get('/refresh/:id')
  // async refresh(@Req() request: Request,
  //               @Res() response: Response,
  //               @Param() param) {
  //   const {refreshToken} = request.cookies
  //   const userData = await this.authService.refresh(refreshToken)
  //   response.cookie('refreshToken',
  //     userData,
  //     {maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true, secure: Boolean(process.env.HTTPS_BOOLEAN)})
  //   return response.json(userData)
  // }

  // Проверка на существование
  @Post('check-user')
  async checkShelterTelegram(@Body() dto: EnterUserDto) {
    return await this.authService.addTelegramShelter(dto);
  }
}
