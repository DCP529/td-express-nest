import mongoose, { HydratedDocument, Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ProductCard } from "../productCard/productCard.schema";

@Schema()
export class PersonalData extends Document {
  @Prop({required: true})
  name: string

  @Prop({required: true})
  family: string

  @Prop({required: true})
  patronymic: string

  @Prop({required: true})
  birthday: string
}

export const PersonalDataSchema = SchemaFactory.createForClass(PersonalData)

@Schema({_id: false})
export class ClosePerson extends Document {
  @Prop({required: true})
  name: string

  @Prop({required: true})
  family: string

  @Prop({required: true})
  patronymic: string

  @Prop({required: true})
  phoneClose: string
}

export const ClosePersonSchema = SchemaFactory.createForClass(ClosePerson)

@Schema()
export class Entity extends Document {
  @Prop({required: true})
  isIndividual: boolean

  @Prop({required: true})
  code: string

  @Prop({required: true})
  bic: string

  @Prop({required: true})
  check: string
}

export const EntitySchema = SchemaFactory.createForClass(Entity)

@Schema()
export class ShelterData extends Document {
  @Prop({type: PersonalDataSchema, required: true})
  personalData: PersonalData

  @Prop({type: ClosePersonSchema, required: true})
  closePerson: ClosePerson

  @Prop({type: EntitySchema, required: true})
  entity: Entity
}

export const ShelterDataSchema = SchemaFactory.createForClass(ShelterData)

@Schema()
export class PointIssue {
  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  nameShop: string;

  @Prop()
  description: string;
}

export const PointIssueSchema = SchemaFactory.createForClass(PointIssue)


@Schema()
export class Shop extends Document {
  @Prop({required: true})
  nameMarket: string

  @Prop()
  description?: string
}

export const ShopSchema = SchemaFactory.createForClass(Shop)

export type ShelterDocument = HydratedDocument<Shelter>

@Schema({timestamps: true})
export class Shelter extends Document {
  @Prop({required: true, unique: true})
  phone: string

  @Prop({required: true, unique: true})
  email: string

  @Prop({required: true})
  password: string

  // @Prop({required: true})
  // fileScan: string

  @Prop({required: true})
  imageShop: string

  @Prop({required: true, default: false})
  isVerified: boolean

  @Prop({type: ShelterDataSchema, required: true})
  shelterData: ShelterData

  @Prop({type: ShopSchema, required: true})
  shop: Shop

  @Prop({ required: true, type: [PointIssueSchema] })
  deliveryPoints: PointIssue[];

  @Prop({required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductCard" }]})
  productCards: ProductCard[]

  @Prop({required: true, type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }]})
  notifications: Notification[]

  @Prop({default: null})
  isPushTelegram: string | null
}

export const ShelterSchema = SchemaFactory.createForClass(Shelter)
