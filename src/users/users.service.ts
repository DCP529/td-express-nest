import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { User, UserDocument } from './users.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { AddRoleDto } from './dto/add-role.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCartDto } from 'src/cart/dto/create-cart.dto';
import { CartService } from "../cart/cart.service";
import { FavoriteService } from "../favorite/favorite.service";
import { CreateNotificationDto } from 'src/notification/dto/notification.dto';
import { NotificationService } from 'src/notification/notification.service';
import { ProductCardService } from 'src/productCard/productCard.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userRepository: Model<UserDocument>,
    //@InjectModel(ProductCard.name) private productCardRepository: Model<ProductCard>,
    private notificationService: NotificationService,
    private productCardService: ProductCardService,
    private cartService: CartService,
    private favoriteService: FavoriteService,
  ) { }

  async createUser(dto: CreateUserDto) {
    return await this.userRepository.create(dto);
  }

  async getAllUsers() {
    return this.userRepository.find({ isBaned: false });
  }

  async getAllBanedUsers() {
    return this.userRepository.find({ isBaned: true });
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({ email });
  }

  async addRole(dto: AddRoleDto) {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new HttpException('Пользователь или роль не найдены', HttpStatus.NOT_FOUND);
    }
    user.role = dto.role;
    return user.save();
  }

  async banUserById(dto: BanUserDto) {
    const user = await this.userRepository.findById(dto.userId);
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    user.isBaned = true;
    user.banReason = dto.banReason;
    return await user.save();
  }

  async searchUsers(query: any) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search = '', filter = {} } = query;

    const sort = 'desc';
    const skip = (page - 1) * limit;

    const filterConditions = {
      ...filter,
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { banReason: { $regex: search, $options: 'i' } },
      ],
      isDeleted: false,
    };

    const users = await this.userRepository.find(filterConditions).sort(sort).skip(skip).limit(limit);

    const totalUsers = await this.userRepository.countDocuments(filterConditions);

    return {
      users,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      perPage: limit,
      sortBy,
      sortOrder,
      search,
      filter,
    };
  }

  async unbanUser(userId: number): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
    if (!user.isBaned) {
      throw new HttpException('Пользователь не забанен', HttpStatus.NOT_FOUND);
    }
    user.isBaned = false;
    user.banReason = undefined;
    return await user.save();
  }

  async addToCart(userId: string, dto: CreateCartDto) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }
      await this.cartService.addToCart(userId, dto)
      return true
      //product.isCart = true;
      //await this.productCardService.updateProductCard(dto.productId, product);
    } catch (e) {
      return false
    }

  }

  async removeFromCart(userId: string, productCardId: string[]) {
    try {

      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
      }

      await this.cartService.removeFromCart(userId, productCardId)
      return true
      // product.isCart = false;
      //await this.productCardService.updateProductCard(productCardId, product);
    } catch (e) {
      return false
    }

  }

  async getFavorites(userId: string) {
    try {
      return await this.favoriteService.getFavoriteProductsCards(userId)
    } catch (e) {
      throw new HttpException('Избранное не найдено', HttpStatus.NOT_FOUND)
    }
  }

  async addToFavorites(userId: string, productId: string) {
    try {
      await this.favoriteService.addToFavorite(userId, productId)
      return true
    } catch (e) {
      return false
    }
  }

  async removeFromFavorite(userId: string, productCardId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new HttpException('Пользователь не найден', HttpStatus.NOT_FOUND);
    }

    await this.favoriteService.removeFromFavorite(userId, productCardId)

    //product.isCart = false;
    //await this.productCardService.updateProductCard(productCardId, product);
  }

  async findById(userId: string) {
    return this.userRepository.findById(userId).exec();
  }

  // async denyProductPublishingRequest(productId: string, userId: string, message: string): Promise<void> {
    //   const productCard = await this.productCardRepository.findById(productId);
    //   if (!productCard) {
    //     throw new Error('Товар не найден');
    //   }

    //   productCard.published = false;

    //   const notification = new this.notificationRepository({
    //     userId,
    //     message,
    //   });

    //   productCard.notifications.push(notification);

    //   await Promise.all([productCard.save(), notification.save()]);
  // }

  async createNotification(dto: CreateNotificationDto) /*: Promise<NotificationDocument>*/ {
    return this.notificationService.createNotification(dto.userId, dto.message);
  }

  async markNotificationAsRead(notificationId: string)/* : Promise<NotificationDocument>*/ {
    return this.notificationService.markNotificationAsRead(notificationId);
  }

  async getUserNotifications(userId: string)/*: Promise<NotificationDocument[]>*/ {
    return this.notificationService.getUserNotifications(userId);
  }

  async getProductCards(userId: string, page: number, limit: number) {
    const productCards = await this.productCardService.getAllProductCards(page, limit); // Retrieve all product cards from the database

      const favoriteProducts = await this.favoriteService.getFavoriteProducts(userId);
      const cartProducts = await this.cartService.getCartProducts(userId);

      for (const productCard of productCards.productCards) {
        productCard.isFavorite = favoriteProducts.some((favoriteProduct) => favoriteProduct.productId === productCard.id);
      }

      for (const productCard of productCards.productCards) {
        productCard.isCart = cartProducts.some((cartProducts) => cartProducts.productId === productCard.id);
      }

    return productCards;
  }

  async getCartProducts(userId: string) {
    const cart = await this.cartService.getCartProductsWithPrices(userId);

    if (!cart) {
      return []; // Return an empty array if no favorites found
    }

    return cart;
  }

  async setCountCart(userId: string, typeId: string, count: number) {
    await this.cartService.setCountCart(userId, typeId, count)
  }

  async addTelegramPush(user: User, chatId: string) {
    try {
      user.isPushTelegram = chatId
      await user.save()
      return true
    } catch (e) {
      throw new HttpException(
        'Не удается подключить уведомления: ' + e.message,
        HttpStatus.BAD_REQUEST
      )
    }

  }
}
