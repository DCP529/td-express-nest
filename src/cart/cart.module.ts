import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Cart, CartSchema } from "./cart-item.schema";
import { CartService } from "./cart.service";

@Module({
  controllers: [],
  providers: [CartService],
  imports: [
    MongooseModule.forFeature([
      {name: Cart.name, schema: CartSchema}
    ]),
  ],
})
export class CartModule {}