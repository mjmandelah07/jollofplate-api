import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      name: 'JollofPlate API',
      version: '1.0.0',
      docs: 'See README.md and docs/PRD.md',
    };
  }
}
