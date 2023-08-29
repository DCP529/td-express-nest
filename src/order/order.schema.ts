import mongoose, { HydratedDocument } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type OrderDocument = HydratedDocument<Order>

@Schema()
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ProductCard', required: true })
  productId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ProductCard', required: true })
  typeId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  userId: string; 

  @Prop({ required: true })
  status: string;

  @Prop({ required: true })
  deliveryMethod: 'pickup' | 'express' | 'doorstep';
}

export const OrderSchema = SchemaFactory.createForClass(Order);