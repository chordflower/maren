import { Controller, Get } from '@nestjs/common'

/**
 * Some util controller.
 */
@Controller('utils')
export class UtilsController {
  /**
   * Returns pong.
   *
   * @returns pong.
   */
  @Get('/ping')
  public ping(): string {
    return 'pong'
  }
}
