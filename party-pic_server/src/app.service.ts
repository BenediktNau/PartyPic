import { Injectable } from '@nestjs/common';
import { picture } from './models/pictures/picture.model';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  
}
