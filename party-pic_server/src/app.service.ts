import { Injectable } from '@nestjs/common';
import { postPictureToDB } from './postrgeController/postrges';
import { picture } from './models/picture.model';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  
}
