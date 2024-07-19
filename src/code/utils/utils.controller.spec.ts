import { beforeEach, describe, expect, it } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { UtilsController } from './utils.controller'

describe('#UtilsController', () => {
  let controller: UtilsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UtilsController],
    }).compile()

    controller = module.get<UtilsController>(UtilsController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('when ping is called', () => {
    it('should return pong', () => {
      expect(controller.ping()).toEqual('pong')
    })
  })
})
