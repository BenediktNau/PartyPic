import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { PicturesDbService } from './pictures/pictures.db.service';
import { PicturesController } from './pictures/pictures.controller';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService
    , private readonly pictureService: PicturesController
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.pictureService.uploadPicture(file, { session_id: "test", u_name: "test" });
  }



}
