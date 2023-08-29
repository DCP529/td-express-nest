import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from "mongoose";
import { ProductCard, Comment } from './productCard.schema';
import { CreateProductCardDto, UpdateProductCardDto } from './dto/create-product-card.dto';
import { SheltersService } from "../shelters/shelters.service";
import { CategoriesService } from "../categories/categories.service";
import moment from "moment";
import { Question } from "src/questionary/questionary.schema";
import { QuestionaryService } from "../questionary/questionary.service";
import { isBase64String } from "../utils/isBase64String";
import * as fs from 'fs';
import * as uuid from 'uuid'
import * as path from "path";

@Injectable()
export class ProductCardService {
  constructor(
    @InjectModel(ProductCard.name) private productCardRepository: Model<ProductCard>,
    @InjectModel(Comment.name) private commentRepository: Model<Comment>,
    private questionService: QuestionaryService,
    private shelterService: SheltersService,
    private categoriesService: CategoriesService,
  ) { }

  async getProductCardById(id: string): Promise<ProductCard> {
    const query = this.productCardRepository.findOne({ _id: id, published: true });
    return query.exec();
  }

  async getProductCardsById(productIds: string[]): Promise<ProductCard[]> {
    return this.productCardRepository.find({ _id: { $in: productIds } });
  }

  async getProductCardByUserId(id: string): Promise<ProductCard> {
    const query = this.productCardRepository.findOne({ _id: id, published: true });
    //поиск по избранному и корзине для объединения в общий список

    return query.exec();
  }

  async createProductCard(
    dto: CreateProductCardDto,
    shelterId: string,
    mainPhoto: string,
    additionalPhotos: string[]
  ) {
    // console.log('CreateProductCardDto', dto);

    for (let field of Object.keys(dto)) {
      if (typeof dto[field] === 'string' && field !== 'nameShelter') {
        try {

          const parsedJson = JSON.parse(dto[field]);
          if (typeof parsedJson === 'object' && parsedJson !== null) {
            dto[field] = parsedJson;
          } else {
            // The parsed JSON is not an object, handle this case
            console.log('Parsed JSON is not an object:', parsedJson);
            // You can throw an error or handle it in some other way
          }
        } catch (error) {
          console.log('error', error);
          // Handle JSON parse error
          throw new HttpException(
            'Ошибка при разборе JSON',
            HttpStatus.BAD_REQUEST
          );
        }
      }
    }

    const product = await this.productCardRepository.create({
      ...dto,
      shelterId,
      mainPhoto,
      additionalPhotos,
      viewsCount: 0,
      // pricesAndQuantity: new PricesAndQuantity(), // Инициализируем поле pricesAndQuantity новым экземпляром класса PricesAndQuantity
    });
    const isAddInShelter = await this.shelterService.addProductCard(shelterId, product._id);

    const isAddInCategories = await this.categoriesService.addProductCard(dto.categories, product._id);
    console.log('product', product);

    if (isAddInShelter && isAddInCategories) {
      return product;
    } else {
      throw new HttpException(
        'Не сохранились данные',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateProductCard(dto: UpdateProductCardDto, id: string) {
    const product = await this.productCardRepository.findById(id);
    if (typeof dto.mainPhoto === 'string') {
      const staticDir = path.join(__dirname, '..', '..', 'static');
      if (isBase64String(dto.mainPhoto)) {
        const base64Data = dto.mainPhoto.replace(/^data:image\/[a-z]+;base64,/, '');
        // Используем значение из product.mainPhoto для пути к файлу
        const filePath = product.mainPhoto;


        const targetPath = path.resolve(staticDir, 'main-photos', path.basename(filePath));
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

      for (let i = 0; i < dto.additionalPhotos.length; i++) {
        const photo = dto.additionalPhotos[i];
        if (typeof photo === 'string') {
          if (isBase64String(photo)) {
            console.log('Элемент массива является base64:', photo);
            // Преобразование base64 в файл и обновление элемента в product.additionalPhotos
            const base64Data = photo.replace(/^data:image\/[a-z]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Проверка индекса и добавление нового элемента, если он не существует
            if (i >= product.additionalPhotos.length) {
              const newFilePath = `./static/additional-photos/${uuid.v4()}.jpg`;
              product.additionalPhotos.push(newFilePath);
              const targetPath = path.resolve(staticDir, 'additional-photos', path.basename(newFilePath))
              // Сохранение файла по новому пути (асинхронно)
              fs.writeFile(targetPath, buffer, (err) => {
                if (err) {
                  console.error('Ошибка при записи файла:', err);
                } else {
                  console.log('Изображение успешно добавлено');
                }
              });
            } else {
              // Используйте product.additionalPhotos[i] для пути к файлу
              const filePath = product.additionalPhotos[i];
              // Замена файла по указанному пути (асинхронно)
              const targetPath = path.resolve(staticDir, 'additional-photos', path.basename(filePath))
              fs.writeFile(targetPath, buffer, (err) => {
                if (err) {
                  console.error('Ошибка при записи файла:', err);
                } else {
                  console.log('Изображение успешно заменено');
                }
              });
            }
          } else {
            console.log('Элемент массива не является base64:', photo);
          }
        }
      }
    }
    const modifiedDto = {
      ...dto,
      mainPhoto: product.mainPhoto,
      additionalPhotos: product.additionalPhotos,
      published: false
    }

    const answer = await this.categoriesService.updateCategories(dto.categories, product.categories, product, id)
    if (!answer) {
      return
    }
    return await this.productCardRepository.findOneAndUpdate(
      { _id: id },
      modifiedDto,
      { new: true }
    ).exec();
  }

  async deleteProductCard(productId: string, shelterId: string): Promise<ProductCard> {
    const productCard = await this.productCardRepository.findOneAndDelete({ _id: productId });
    console.log('deleteProductCard productCard', productCard)
    // Удаление файла mainPhoto
    const mainPhoto = productCard.mainPhoto;
    // const mainPhotoFilename = mainPhoto.substring(mainPhoto.lastIndexOf('/') + 1);
    const mainPhotoFilePath = `./static${mainPhoto}`;
    // console.log('fs', mainPhotoFilename)
    console.log('mainPhotoFilePath', mainPhotoFilePath)
    fs.unlink(mainPhotoFilePath, (error) => {
      if (error) {
        console.error('Ошибка при удалении файла mainPhoto:', error);
      }
    });

    // Удаление файлов из additionalPhotos
    const additionalPhotos = productCard.additionalPhotos;
    additionalPhotos.forEach((photo) => {
      const filePath = `./static/${photo}`;
      fs.unlink(filePath, (error) => {
        if (error) {
          console.error('Ошибка при удалении файла additionalPhoto:', error);
        }
      });
    });

    const isCategoryRemovalSuccessful = await this.categoriesService.removeProductCardFromCategories(productId);

    const isShelterRemovalSuccessful = await this.shelterService.removeProductCardFromShelter(shelterId, productId);

    // Проверяем, было ли успешно удаление карточки товара из категорий и приюта
    const isDeletionSuccessful = isCategoryRemovalSuccessful && isShelterRemovalSuccessful;

    if (isDeletionSuccessful) {
      return productCard;
    } else {
      // Обработка случая, когда удаление не было успешным
      // Можно выбросить исключение или вернуть null/undefined в зависимости от требований
    }
  }

  async getNewProductCards(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const totalCount = await this.productCardRepository.countDocuments({
      published: true
    });

    const totalPages = Math.ceil(totalCount / limit);

    const productCards = await this.productCardRepository
      .find({
        published: true
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      productCards,
      totalPages,
      currentPage: page,
    };
  }

  async searchProductCardsByCategory(
    category?: string,
    page?: number,
    limit?: number,
    minPrice?: number,
    maxPrice?: number,
    color?: string,
    size?: string,
  ) {
    let query = this.productCardRepository.find({
      published: true,
      typeQuantity: { $elemMatch: { quantity: { $gt: 0 } } }, // Добавленное условие
    });
  
    if (category && category.trim() !== '') {
      query = query.or([
        { 'categories.category.id': category },
        { 'categories.subcategory.id': category },
        { 'categories.section.id': category },
      ]);
    }
  
    if (minPrice !== undefined && minPrice !== null) {
      query = query.find({ 'pricesAndQuantity.price': { $gte: minPrice } });
    }
  
    if (maxPrice !== undefined && maxPrice !== null) {
      query = query.find({ 'pricesAndQuantity.price': { $lte: maxPrice } });
    }
  
    if (color && color.trim() !== '') {
      query = query.find({ colors: color });
    }
  
    if (size && size.trim() !== '') {
      query = query.find({
        'typeQuantity': {
          $elemMatch: {
            size: size,
            quantity: { $gt: 0 },
          },
        },
      });
    }
  
    return query
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
  }
  
  


  async searchProductCards(
    query: string,
    page?: number,
    limit?: number,
    minPrice?: number,
    maxPrice?: number,
    color?: string,
    size?: string,
  ) {
    const regexQuery = new RegExp(query, 'i');
    // Добавьте фильтрацию по ценовому диапазону, цвету, размеру и количеству больше 0
    const filter = {
      $and: [
        {
          $or: [
            { 'categories.category': regexQuery },
            { 'categories.subcategory': regexQuery },
            { 'categories.section': regexQuery },
            { 'information.name': regexQuery },
            { 'information.description': regexQuery },
          ],
        },
        { published: true },
        { 'pricesAndQuantity.price': { $gte: minPrice || 0, $lte: maxPrice || Number.MAX_SAFE_INTEGER } },
        // Добавляем фильтр только если size не пустая строка
        ...(size !== "" ? [
          {
            typeQuantity: {
              $elemMatch: { size: size },
            },
          },
        ] : []),
        {
          // Фильтр для суммы quantity больше 0
          $expr: {
            $gt: [
              {
                $sum: {
                  $map: {
                    input: '$typeQuantity',
                    as: 'item',
                    in: '$$item.quantity',
                  },
                },
              },
              0,
            ],
          },
        },
      ],
    };

// { 'pricesAndQuantity.quantity': { $gt: 0 } }, // Фильтр для количества больше 0

    const totalCount = await this.productCardRepository.countDocuments(filter);

    const totalPages = Math.ceil(totalCount / limit);

    const productCards = await this.productCardRepository
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    return {
      productCards,
      totalPages,
      currentPage: page,
    };
  }

  async getProductCardSummary(id: string) {
    const query = this.productCardRepository.findOne({ _id: id, published: true })
      .select('information.name information.description pricesAndQuantity');
    return query.exec();
  }

  async getProductCardDetails(id: string) {
    const query = this.productCardRepository.findOne({ _id: id, published: true });
    return query.exec();
  }

  async addViewToProductCard(id: string) {
    // Проверка валидности id
    if (!isValidObjectId(id)) {
      return false;
    }

    const query = this.productCardRepository.findOneAndUpdate(
      { _id: id, published: true },
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
    const result = await query.exec();

    return result !== null;


  }

  async getAllProductCards(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const totalCount = await this.productCardRepository.countDocuments({
      published: true,
      'pricesAndQuantity.quantity': { $gt: 0 }, // Фильтр для количества больше 0
    });
    const totalPages = Math.ceil(totalCount / limit);

    const productCards = await this.productCardRepository
      .find({ published: true, 'pricesAndQuantity.quantity': { $gt: 0 } }) // Фильтр для количества больше 0
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      productCards,
      totalPages,
      currentPage: page,
    };
  }

  async getHotOffers(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const totalCount = await this.productCardRepository.countDocuments({
      published: true
    });

    const totalPages = Math.ceil(totalCount / limit);

    const hotOffers = await this.productCardRepository
      .find({
        published: true
      })
      .sort({ viewsCount: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      productCards: hotOffers,
      totalPages,
      currentPage: page,
    };
  }




  async applyDiscountToProductCard(id: string, discount: number) {
    const product = await this.productCardRepository.findById(id).exec();

    if (!product) {
      throw new HttpException('Карточка продукта не найдена', HttpStatus.NOT_FOUND);
    }

    product.pricesAndQuantity.priceBeforeDiscount = product.pricesAndQuantity.price; // Сохраняем текущую цену в поле priceBeforeDiscount
    product.pricesAndQuantity.price = product.pricesAndQuantity.price * (1 - discount / 100); // Применяем скидку

    return product.save();
  }

  async getDiscountedProductCards(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const totalCount = await this.productCardRepository.countDocuments({ 'pricesAndQuantity.price': { $lt: 'pricesAndQuantity.priceBeforeDiscount' } });
    const totalPages = Math.ceil(totalCount / limit);

    const discountedProductCards = await this.productCardRepository
      .find({ 'pricesAndQuantity.price': { $lt: 'pricesAndQuantity.priceBeforeDiscount' } })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      discountedProductCards,
      totalPages,
      currentPage: page,
    };
  }

  async addCommentToProduct(productId: string, userId: string, content: string): Promise<Comment> {
    const product = await this.productCardRepository.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    const comment = new this.commentRepository({ productId, userId, content });
    await comment.save();


    product.comments.push(comment._id);
    await product.save();

    return comment;
  }

  async deleteComment(productId: string, commentId: string): Promise<void> {
    const product = await this.productCardRepository.findById(productId);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }

    // Удаление комментария из списка комментариев товара
    const commentIndex = product.comments.findIndex((id) => id.toString() === commentId);
    if (commentIndex === -1) {
      throw new HttpException('Comment not found in product', HttpStatus.NOT_FOUND);
    }
    product.comments.splice(commentIndex, 1);

    await Promise.all([product.save(), comment.deleteOne()]);
  }

  async updateComment(
    productId: string,
    commentId: string,
    content: string
  ): Promise<Comment> {
    const product = await this.productCardRepository.findById(productId);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const comment = await this.commentRepository.findById(commentId);
    if (!comment) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  async getCommentsByProduct(productId: string): Promise<Comment[]> {
    const product = await this.productCardRepository
      .findById(productId)
      .populate('comments')
      .exec();
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    return product.comments;
  }



  async getUnpublishedProductCards(page: number, limit: number) {
    // const skip = (page - 1) * limit;

    // const totalCount = await this.productCardRepository.countDocuments({
    //   published: false,
      // 'shelter.isVerified': true,
      // 'pricesAndQuantity.quantity': { $gt: 0 }, // Фильтр для количества больше 0
    // })
      // .populate('shelter', 'isVerified');
    // const totalPages = Math.ceil(totalCount / limit);

    const unpublishedProductCards = await this.productCardRepository
      .find({ published: false, }) // Фильтр для количества больше 0
      // .populate('shelter', 'isVerified')
      // .skip(skip)
      // .limit(limit)
      .exec();

    return [
      ...unpublishedProductCards
      // productCards: unpublishedProductCards,
      // totalPages,
      // currentPage: page,
    ];
  }


  async getTotalPurchases(): Promise<{ total: number; totalLastMonth: number; totalAmount: number; totalAmountLastMonth: number }> {
    const total = await this.productCardRepository.aggregate([
      {
        $group: {
          _id: null,
          totalPurchaseCount: { $sum: "$purchaseCount" },
          totalAmount: { $sum: "$pricesAndQuantity.price" }
        }
      }
    ]);

    const totalLastMonth = await this.productCardRepository.aggregate([
      {
        $match: {
          createdAt: { $gte: moment().subtract(1, 'months').toDate() }
        }
      },
      {
        $group: {
          _id: null,
          totalPurchaseCount: { $sum: "$purchaseCount" },
          totalAmount: { $sum: "$pricesAndQuantity.price" }
        }
      }
    ]);

    const totalAmount = await this.productCardRepository.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$pricesAndQuantity.price' } } },
    ]);
    const totalAmountLastMonth = await this.productCardRepository.aggregate([
      { $match: { createdAt: { $gte: moment().subtract(1, 'months').toDate() } } },
      { $group: { _id: null, totalAmount: { $sum: '$pricesAndQuantity.price' } } },
    ]);

    return {
      total: total[0].totalPurchaseCount,
      totalLastMonth: totalLastMonth[0].totalPurchaseCount,
      totalAmount: totalAmount[0] ? totalAmount[0].totalAmount : 0,
      totalAmountLastMonth: totalAmountLastMonth[0] ? totalAmountLastMonth[0].totalAmount : 0,
    };
  }

  async createQuestion(productId: string, customerId: number, questionText: string): Promise<Question> {
    const product = await this.getProductCardById(productId);
    return this.questionService.createQuestion(product, customerId, questionText);
  }

  async answerQuestion(questionId: string, answerText: string) {
    return this.questionService.answerQuestion(questionId, answerText);
  }

  async getAllQuestions() {
    return this.questionService.getAllQuestions();
  }

  async getQuestionById(questionId: string) {
    return this.questionService.getQuestionById(questionId);
  }

  async getAllAnsweredQuestions() {
    return this.questionService.getAllAnsweredQuestions();
  }

  async getAnswerForQuestion(questionId: string) {
    return this.questionService.getAnswerForQuestion(questionId);
  }

  async agreementGood(id: string) {
    try {
      const good = await this.productCardRepository.findById(id)
      console.log('good', good);

      good.published = true
      good.isReject = false
      await good.save()

      return true
    } catch (e) {
      console.log('e', e);
      return false
    }
  }

  async rejectGood(id: string) {
    try {
      const good = await this.productCardRepository.findById(id)
      good.isReject = true
      await good.save()
      return true
    } catch (e) {
      return false
    }
  }
}
