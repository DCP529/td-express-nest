import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { CreateShelterDto } from "../shelters/dto/create-shelter.dto";
import { SheltersService } from "../shelters/shelters.service";
import * as bcrypt from "bcryptjs";
import { EnterUserDto } from "../users/dto/enter-user.dto";
import { NewPasswordDto } from "./dto/new-password.dto";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthShelterService {
  constructor(private shelterService: SheltersService,
              private jwtService: JwtService
            ) {
  }


  async checkShelter(email: string) {
    return await this.shelterService.getShelterByEmail(email)
  }

  async createNewPassword(passwordDto: NewPasswordDto) {
    const shelter = await this.shelterService.getShelterByEmail(passwordDto.email)
    if (!shelter) {
      throw new HttpException(
        'Продавца с таким email не существует',
        HttpStatus.BAD_REQUEST
      )
    }
    shelter.password = await bcrypt.hash(passwordDto.password, 5)
    await shelter.save()
    return true;
  }

  async registration(shelterDto: CreateShelterDto, photoShopPath: string) {
    const candidate = await this.shelterService.getShelterByEmail(shelterDto.email)
    if (candidate) {
      throw new HttpException(
        'Продавец с таким email существует',
        HttpStatus.BAD_REQUEST
      )
    }
    const hashPassword = await bcrypt.hash(shelterDto.password, 5)

    for (let field of Object.keys(shelterDto)) {
      if (field === 'shelterData' || field === 'shop' || field === 'deliveryPoints') {
        // @ts-ignore
        shelterDto[field] = JSON.parse(shelterDto[field])
      }
    }
    return await this.shelterService.createShelter({...shelterDto, password: hashPassword}, photoShopPath)
  }

  async login(shelterDto: EnterUserDto) {
    return await this.validateShelter(shelterDto)
  }

  private async validateShelter(userDto: EnterUserDto) {
    const shelter = await this.shelterService.getShelterByEmail(userDto.email)
    if (!shelter) {
      throw new UnauthorizedException({message: 'Некорректный емайл или пароль'})
    }
    const passwordEquals = await bcrypt.compare(userDto?.password, shelter?.password)
    if (shelter && passwordEquals) {
      return shelter
    }
    throw new UnauthorizedException({message: 'Некорректный емайл или пароль'})
  }

  createAccessToken(shelter) {
    const payload = { sub: shelter.id, email: shelter.email, user: 'shelter' };
    // console.log('payload', payload)
    return this.jwtService.signAsync(payload);
  }

  async getUserById(id: string) {
    return await this.shelterService.findById(id);
  }

  async addTelegramShelter(dto: EnterUserDto) {
    const validationShelter = await this.validateShelter(dto)

    return await this.shelterService.addTelegramPush(validationShelter, dto.chatId)
  }
}

