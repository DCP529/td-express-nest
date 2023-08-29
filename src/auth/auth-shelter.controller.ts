import {
  Body,
  Controller, Get,
  HttpCode,
  HttpStatus, Param,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
  UsePipes
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ValidationPipe } from "../pipes/validation.pipe";
import { AuthShelterService } from "./auth-shelter.service";
import { Response } from "express";
import { CreateShelterDto } from "../shelters/dto/create-shelter.dto";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { editFileName, imageFileFilter } from "../utils/file-upload.utils";
import { EnterUserDto } from "../users/dto/enter-user.dto";
import { NewPasswordDto } from "./dto/new-password.dto";

@ApiTags('Авторизация продавца')
@Controller('auth-shelter')
export class AuthShelterController {
  constructor(private authService: AuthShelterService) {
  }

  @Post('/registration')
  @UseInterceptors(
    FileFieldsInterceptor([
      // { name: 'fileScan', maxCount: 1 },
      { name: 'imageShop', maxCount: 1 },
    ], {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // let destination = './static/shelter-scans';
          // if (file.fieldname === 'imageShop') {
            let destination = './static/shelter-shops';
          // }
          cb(null, destination);
        },
        filename: editFileName
      }),
      fileFilter: imageFileFilter,
    })
  )
  async registration(
    @Body() shelterDto: CreateShelterDto,
    @UploadedFiles() images: { imageShop?: Express.Multer.File },
    @Res({passthrough: true}) response: Response
  ) {
    const {imageShop} = images
    // const photoPath = `/shelter-scans/${fileScan[0].filename}`;
    const photoShopPath = `/shelter-shops/${imageShop[0].filename}`;
    const shelter = await this.authService.registration(
      shelterDto,
      // photoPath,
      photoShopPath
    )
    const token = await this.authService.createAccessToken(shelter);
    response.cookie('access_token_shelter', token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: Boolean(process.env.HTTPS_BOOLEAN) ? 'none' : 'strict',
      secure: Boolean(process.env.HTTPS_BOOLEAN)
    })
    return { shelter, token }
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({summary: 'Логин продавца'})
  @ApiResponse({status: 200, type: 'sddsf'})
  @UsePipes(ValidationPipe)
  @Post('/login')
  async login(@Body() userDto: EnterUserDto,
              @Res({passthrough: true}) response: Response) {
    const shelter = await this.authService.login(userDto)
    const token = await this.authService.createAccessToken(shelter);
    response.cookie('access_token_shelter', token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: Boolean(process.env.HTTPS_BOOLEAN) ? 'none' : 'strict',
      secure: Boolean(process.env.HTTPS_BOOLEAN)
    })
    return { shelter, token }
  }

  @Get('/check/:email/:phone')
  async checkShelter(
      @Param('email') email: string,
      @Param('phone') phone: string,
  ) {
    return await this.authService.checkShelter(email /*,phone*/)
  }

  @Post('/create-password')
  async createNewPassword(@Body() passwordDto: NewPasswordDto) {
    return await this.authService.createNewPassword(passwordDto)
  }

  // Проверка на существование
  @Post('check-shelter')
  async checkShelterTelegram(@Body() dto: EnterUserDto) {
    return await this.authService.addTelegramShelter(dto);
  }
}


