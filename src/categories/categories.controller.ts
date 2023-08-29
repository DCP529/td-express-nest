
import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { CategoriesService } from "./categories.service";

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {
  }

  @Post('/category')


  async saveCategory(@Body() dtoCat) {
    return this.categoriesService.saveCategory(dtoCat)
  }
  //
  // @Post('/subcategories')
  // async saveSubcategories(@Body() dtoCat) {
  //   return this.categoriesService.saveSubcats(dtoCat)
  // }
  //
  // @Post('/sections')
  // async saveSections(@Body() dtoCat) {
  //   return this.categoriesService.saveSections(dtoCat)
  // }
  //
  // @Post('/ctosub')
  // async cattoSub(@Body() dtoCat) {
  //   return this.categoriesService.cattoSub(dtoCat)
  // }
  //
  // @Post('/subtosec')
  // async subtoSec(@Body() dtoCat) {
  //   return this.categoriesService.subtoSec(dtoCat)
  // }

  @Get('/category/:id')
  async getCategory(@Param('id') id: string) {
    return await this.categoriesService.getCategory(id)
  }

  @Get()
  async getAllCategories() {
    return await this.categoriesService.getAll()
  }
}
