import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Shelter, ShelterDocument } from "./shelters.schema";
import {CreateShelterDto, ShelterDataDto, UpdateShelterShopDto} from "./dto/create-shelter.dto";
import { ProductCard, ProductCardDocument } from 'src/productCard/productCard.schema';
import { Order, OrderDocument } from 'src/order/order.schema';
import { User, UserDocument } from 'src/users/users.schema';
import * as path from "path";
import {isBase64String} from "../utils/isBase64String";
import fs from "fs";
import {NotificationDocument, Notification} from "../notification/notification.schema";

@Injectable()
export class SheltersService {
  constructor(@InjectModel(Shelter.name) private shelterRepository: Model<ShelterDocument>,
              @InjectModel(ProductCard.name) private readonly productCardModel: Model<ProductCardDocument>,
              @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
              @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
              @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
  ) {
  }

  async getShelterByEmail(email: string) {
    return await this.shelterRepository.findOne({email}).exec();
  }

  async getShelterName(id: string) {
    const shelter = await this.shelterRepository.findById(id).exec();
    return shelter?.shop.nameMarket
  }

  async checkShelter(email: string, phone: string) {
    const shelterEmail = await this.shelterRepository.findOne({email}).exec();
    const shelterPhone = await this.shelterRepository.findOne({phone}).exec();
    return {
      email: Boolean(shelterEmail),
      phone: Boolean(shelterPhone),
    };
  }

  async createShelter(dto: CreateShelterDto, fileNameShop: string) {
    return await this.shelterRepository.create({...dto, imageShop: fileNameShop})
  }

  async getDeliveryPoints(shelterId: string) {
    const shelter = await this.shelterRepository.findById(shelterId).populate('deliveryPoints').exec();
    return shelter.deliveryPoints;
  }

  // async countUnreadNotifications(shelter: Shelter): Promise<number> {
  //   const notifications = await shelter.populate('notifications');
  //
  //   const unreadCount = notifications.reduce((count, notification) => {
  //     console.log('notification', notification)
  //     // @ts-ignore
  //     if (!notification.isRead) {
  //       count++;
  //     }
  //     return count;
  //   }, 0);
  //
  //   return unreadCount;
  // }

  async findById(shelterId: string) {

    const shelter = await this.shelterRepository
        .findById(shelterId)
        .populate('notifications')
        .exec();

    const unreadCount = shelter.notifications.reduce((count, notification) => {
      // @ts-ignore
      if (!notification.isRead) {
        count++;
      }
      return count;
    }, 0);

    // console.log('shelter', shelter)
    // console.log('unreadCount', unreadCount)

    return { shelter, unreadCount };
  }

  async findByIdForGood(shelterId: string) {

    const shelter = await this.shelterRepository.findById(shelterId)

    return {
      name: shelter.shop.nameMarket,
      description: shelter.shop.description,
      imageShop: shelter.imageShop,
      id: shelter._id
    }
  }


  async getCards(shelterId: string, page: number, limit: number) {
    const shelter = await this.shelterRepository
        .findById(shelterId)
        .populate({
          path: 'productCards',
          options: {
            skip: (page - 1) * limit, // Пропустить элементы предыдущих страниц
            limit: limit // Ограничить количество элементов на странице
          }
        })
        .exec();
    return shelter.productCards;
  }

  async addProductCard(shelterId: string, productCard: ProductCard) {
    try {
      const shelter = await this.shelterRepository.findById(shelterId)
      if (!shelter.isVerified) {
        productCard.published = false;
      }
      shelter.productCards.push(productCard);
      await shelter.save();
      return true
    } catch (e) {
      console.error('\'Error adding product card:\',', e)
      return false
    }
  }

  async getAllShelters(status: string, fromDate: Date, toDate: Date) {
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (fromDate && toDate) {
      filter.createdAt = {$gte: fromDate, $lte: toDate};
    }

    return this.shelterRepository.find(filter).exec();
  }

  async getOrdersByShelter(shelterId: string): Promise<any[]> {
    const productCards = await this.productCardModel.find({shelterId}).exec();
    const productCardIds = productCards.map((card) => card._id);

    const orders = await this.orderModel.find({productId: {$in: productCardIds}}).exec();

    return await Promise.all(
        orders.map(async (order) => {
          const user = await this.userModel.findById(order.userId).exec();
          const product = await this.productCardModel.findById(order.productId).exec();

          return {
            user,
            product,
            status: order.status,
            order: order
          };
        })
    );

  }

  async updateOrderStatus(orderId: string, newStatus: string): Promise<Order | null> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      return null;
    }

    order.status = newStatus;
    await order.save();

    return order;
  }

  async removeProductCardFromShelter(shelterId: string, productCardId: string): Promise<boolean> {
    const result = await this.shelterRepository.updateOne(
        {_id: shelterId},
        {$pull: {productCards: productCardId}},
    );
    return result.modifiedCount > 0;
  }

  async updateShelterData(shelterId: string, shelterDataDto: ShelterDataDto) {
    try {
      const shelter = await this.shelterRepository.findById(shelterId)
      // @ts-ignore
      shelter.shelterData = shelterDataDto
      await shelter.save()
      return shelter
    } catch (e) {
      return false
    }

  }

  async updateShopData(shelterId: string, shelterShopDto: UpdateShelterShopDto) {

    try {
      const shelter = await this.shelterRepository.findById(shelterId)
      if (typeof shelterShopDto.imageShop === 'string') {
        const staticDir = path.join(__dirname, '..', '..', 'static');
        if (isBase64String(shelterShopDto.imageShop)) {
          const base64Data = shelter.imageShop.replace(/^data:image\/[a-z]+;base64,/, '');
          // Используем значение из product.mainPhoto для пути к файлу
          const filePath = shelter.imageShop;


          const targetPath = path.resolve(staticDir, 'shelter-shops', path.basename(filePath));
          // Создаем буфер из строки base64
          const buffer = Buffer.from(base64Data, 'base64');
          // Записываем буфер в файл (асинхронно)
          fs.writeFile(targetPath, buffer, (err) => {
            if (err) {
              console.error('Ошибка при записи файла:', err);
            } else {
              console.log('Изображение успешно заменено');
            }
          });
        } else {
          console.log('Строка не является base64');
        }
      }

      shelter.shop.nameMarket = shelterShopDto.shelterShop.nameMarket
      shelter.shop.description = shelterShopDto.shelterShop.description
      // @ts-ignore
      shelter.deliveryPoints = shelterShopDto.deliveryPoints
      await shelter.save()
      return shelter
    } catch (e) {
      throw new HttpException(
          'Не удается обновить: ' + e.message,
          HttpStatus.BAD_REQUEST
      )
    }

  }

  async getUnverifiedShelters() {
    return this.shelterRepository.find({isVerified: false});
  }

  async agreementShelter(id: string) {
    try {
      const shelter = await this.shelterRepository.findById(id)
      shelter.isVerified = true
      await shelter.save()
      return true
    } catch (e) {
      return false
    }
  }

  async pushNotificationRefToShelter(userId: string, notificationId) {
    try {
      const shelter = await this.shelterRepository.findById(userId)
      shelter.notifications.push(notificationId)
      await shelter.save()
      return true
    } catch (e) {
      return false
    }

  }

  async getNotificationsByShelter(shelterId: string) {
    const shelter = await this.shelterRepository
        .findById(shelterId)
        .populate('notifications')
        .exec();
    return shelter.notifications
  }

  async readNotificationsByShelter(shelterId: string) {
    const shelter = await this.shelterRepository
        .findById(shelterId)
        .populate('notifications')
        .exec();

    // Обновление поля isRead для каждого уведомления
    for (const notification of shelter.notifications) {
      // @ts-ignore
      await notification.updateOne({isRead: true});
    }

    // Вернуть обновленный объект Shelter
    return shelter;

  }

  async deleteNotificationsByShelter(shelterId: string, deleteIds: string[]) {
    try {

      await this.notificationModel.deleteMany({ _id: { $in: deleteIds } });
      const shelter = await this.shelterRepository
          .findById(shelterId)
          .populate('notifications')
          .exec();

      // Удаление ObjectId из массива notifications

      shelter.notifications = shelter.notifications.filter(notification => {
            // @ts-ignore
            return !deleteIds.includes(notification._id.toString())

      }
      );
      // Сохранение обновленного объекта Shelter
      await shelter.save();

      return shelter.notifications;
    } catch (error) {
      console.error('Ошибка при удалении уведомлений:', error);
      return [];
    }
  }

  async addTelegramPush(shelter: Shelter, chatId: string) {
    try {
      shelter.isPushTelegram = chatId
      await shelter.save()
      return true
    } catch (e) {
      throw new HttpException(
        'Не удается подключить уведомления: ' + e.message,
        HttpStatus.BAD_REQUEST
      )
    }

  }
}
