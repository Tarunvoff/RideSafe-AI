import { Module } from '@nestjs/common';
import { IvrController } from './ivr.controller';
import { AssistantModule } from '../assistant/assistant.module';

@Module({
  imports: [AssistantModule],
  controllers: [IvrController],
})
export class IvrModule {}
