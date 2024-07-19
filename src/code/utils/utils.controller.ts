import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

/**
 * Some util controller.
 */
@Controller('utils')
@ApiTags('utils')
export class UtilsController {
  /**
   * Returns pong.
   *
   * @returns pong.
   */
  @Get('/ping')
  @ApiOperation({
    summary: 'Operation to return pong',
  })
  @ApiOkResponse({
    description: 'Returns the string pong',
  })
  public ping(): string {
    return 'pong'
  }
}
