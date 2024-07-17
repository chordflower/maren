/**
 * Copyright (C) 2024 carddamom
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { fastifyHelmet as helmet } from '@fastify/helmet'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Logger } from 'nestjs-pino'
import { v7 } from 'uuid'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      requestIdHeader: 'X-Request-Id',
      genReqId: (req: any): any => {
        const existingID: string = req.id ?? req.headers['X-Request-Id'] ?? v7()
        req.id = existingID
        return existingID
      },
      logger: {
        genReqId: (req: any): string => req.id ?? req.headers['X-Request-Id'] ?? v7(),
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                destination: 1,
              },
            },
          ],
        },
      },
    }),
    { bufferLogs: true },
  )
  const logger = app.get(Logger)
  app.useLogger(logger)
  app.enableCors({
    origin: true,
  })
  await app.register(helmet)

  const configService = app.get(ConfigService)

  const port = configService.get<number>('server.port', 28081)
  const address = configService.get<string>('server.address', '127.0.0.1')
  logger.log(`The server url is http://${address}:${port}/`)

  app.enableShutdownHooks()

  await app.listen(port, address)
}

await bootstrap()
