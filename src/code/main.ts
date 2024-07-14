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

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { ConfigService } from '@nestjs/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  const configService = app.get(ConfigService)

  const port = configService.get<number>('server.port', 28081)
  const address = configService.get<string>('server.address', '127.0.0.1')

  app.enableShutdownHooks()

  await app.listen(port, address)
}

await bootstrap()
