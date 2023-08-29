import mongoose, { Document, HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  PointIssue
} from "../shelters/shelters.schema";
import { NotificationDocument, NotificationSchema } from 'src/notification/notification.schema';

@Schema()
export class ParentCategory extends Document {
  @Prop({ required: true })
  id: string;

  @Prop({ type: String})
  name: string;
}

export const ParentCategorySchema = SchemaFactory.createForClass(ParentCategory);

@Schema()
export class Category extends Document {
  @Prop({ type: ParentCategorySchema , required: true })
  category: ParentCategory;

  @Prop({ type: ParentCategorySchema , required: true })
  subcategory: ParentCategory;

  @Prop({ type: ParentCategorySchema , required: false, default: null })
  section: ParentCategory;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

@Schema()
export class Information extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;
}

export const InformationSchema = SchemaFactory.createForClass(Information);

@Schema()
export class AdditionalInformation extends Document {
  @Prop({ default: '' })
  material: string;

  @Prop({ default: '' })
  recommendations: string;
}

export const AdditionalInformationSchema = SchemaFactory.createForClass(AdditionalInformation);

@Schema()
export class PricesAndQuantity extends Document {
  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  priceBeforeDiscount: number;

  @Prop({ required: true })
  quantity: number;
}

export const PricesAndQuantitySchema = SchemaFactory.createForClass(PricesAndQuantity);

@Schema()
export class Dimensions extends Document {
  @Prop({ required: true })
  length: number;

  @Prop({ required: true })
  width: number;

  @Prop({ required: true })
  height: number;

  @Prop({ required: true })
  weight: number;
}

export const DimensionsSchema = SchemaFactory.createForClass(Dimensions);

@Schema()
export class DeliveryPoint extends Document {
  @Prop({ required: true })
  objectId: string;
}

export const DeliveryPointSchema = SchemaFactory.createForClass(DeliveryPoint);

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true })
  productId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  content: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// @Schema()
// export class ProductStatus extends Document {
//   @Prop({ required: true })
//   name: string;
// }

// export const ProductStatusSchema = SchemaFactory.createForClass(ProductStatus);

@Schema()
export class Color extends Document {
  @Prop({ required: true })
  name: string;
}

export const ColorSchema = SchemaFactory.createForClass(Color);

@Schema()
export class Size extends Document {
  @Prop({ required: true })
  name: string;
}

export const SizeSchema = SchemaFactory.createForClass(Size);

@Schema()
export class ProductPriceRange extends Document {
  @Prop({ required: true })
  minPrice: number;

  @Prop({ required: true })
  maxPrice: number;
}

export const ProductPriceRangeSchema = SchemaFactory.createForClass(ProductPriceRange);



@Schema()
export class SizeQuantity extends Document {
  @Prop({required: true})
  size: string

  @Prop({required: true})
  quantity: string
}

export const SizeQuantitySchema = SchemaFactory.createForClass(SizeQuantity)

export type ProductCardDocument = HydratedDocument<ProductCard>

@Schema({ timestamps: true })
export class ProductCard extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Shelter' })
  shelterId: string;

  @Prop({ type: CategorySchema, required: true })
  categories: Category;

  @Prop({ type: InformationSchema, required: true })
  information: Information;

  @Prop({ required: true })
  mainPhoto: string;

  @Prop({ type: [String], required: true })
  additionalPhotos: string[];

  @Prop({ type: AdditionalInformationSchema, required: true })
  additionalInformation: AdditionalInformation;

  @Prop({ type: PricesAndQuantitySchema, required: true })
  pricesAndQuantity: PricesAndQuantity;

  @Prop({ type: DimensionsSchema, required: true })
  dimensions: Dimensions;

  @Prop({ type: Number, default: 0 })
  viewsCount: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PointIssue' }] })
  deliveryPoints: PointIssue[];

  @Prop({ type: [CommentSchema], default: [] })
  comments: Comment[];

  @Prop({ type: Boolean, default: false })
  published: boolean;

  @Prop({ type: Boolean, default: false })
  isReject: boolean;

  @Prop({ type: [NotificationSchema], default: [] })
  notifications: NotificationDocument[];

  @Prop({ type: Number, default: 0 }) //куоличество покупок
  purchaseCount: number;

  @Prop({ type: Boolean, default: false }) //в избранном
  isFavorite: boolean;

  @Prop({ type: Boolean, default: false }) //в корзине
  isCart: boolean;
  // @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'ProductStatus' })
  // status: ProductStatus;

  @Prop({required: false, type: [SizeQuantitySchema]})
  typeQuantity: SizeQuantity[]

  @Prop({ type: [ColorSchema], default: [] })
  colors: Color[];

  @Prop({ type: [SizeSchema], default: [] })
  sizes: Size[];

  @Prop({ type: ProductPriceRangeSchema, required: false })
  priceRange: ProductPriceRange;

  @Prop({ type: String })
  nameShelter: string
}
export const ProductCardSchema = SchemaFactory.createForClass(ProductCard);

// ProductCardSchema.pre('remove', async function (next) {
//   const deletedProductCard = this as unknown as ProductCard;
//
//   // Обновление или удаление ссылок на удаленный документ в других коллекциях
//   // Например:
//   await SomeOtherModel.updateMany(
//       {productCard: deletedProductCard._id}, // условие поиска ссылок
//       {$unset: {productCard: 1}} // удаление ссылок
//   );
//
//   next()
// })
