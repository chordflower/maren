import { Module } from '@nestjs/common'
import { UtilsController } from './utils.controller.js'

/**
 * The utils module
 */
@Module({
  controllers: [UtilsController],
})
export class UtilsModule {}
