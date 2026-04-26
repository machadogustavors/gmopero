import { Module } from '@nestjs/common';
import { FiscalController } from './fiscal.controller';
import { PlugnotasService } from './plugnotas.service';

@Module({
  controllers: [FiscalController],
  providers: [PlugnotasService],
  exports: [PlugnotasService],
})
export class FiscalModule {}
