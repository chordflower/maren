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
import 'dotenv/config'
import { readFile } from 'fs/promises'
import { Logger } from 'nestjs-pino'
import { v7 } from 'uuid'
import { AppModule } from './app.module.js'
import https from 'https'
import * as ocsp from 'ocsp'

async function bootstrap() {
  let httpsConfig: https.ServerOptions | undefined = undefined
  if ('true' === process.env['TLS_ENABLED']) {
    httpsConfig = {
      key: (await readFile(new URL(process.env['TLS_KEY'] ?? '', import.meta.url), 'utf8')).replace(/\\n/g, '\n'),
      cert: (await readFile(new URL(process.env['TLS_CERTIFICATE'] ?? '', import.meta.url), 'utf8')).replace(
        /\\n/g,
        '\n',
      ),
      minVersion: 'TLSv1.3',
    }
  }
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      https: httpsConfig ?? {},
      http2: true,
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
  const cache = new ocsp.Cache()

  app.enableShutdownHooks()

  if ('true' === configService.get<string>('tls.enabled', 'false')) {
    logger.log('Enabling OCSP Request listener for TLS certificates')
    app
      .getHttpAdapter()
      .getInstance()
      .server.on('OCSPRequest', (cert, issuer, cb) => {
        ocsp.getOCSPURI(cert, (err: any, uri: any) => {
          if (err) return cb(err)
          if (null === uri) return cb()

          const req = ocsp.request.generate(cert, issuer)
          cache.probe(req.id, (err2: any, cached: any) => {
            if (err2) return cb(err2)
            if (false !== cached) return cb(null, cached.response)

            const options = {
              url: uri,
              ocsp: req.data,
            }

            cache.request(req.id, options, cb)
            return null
          })
          return null
        })
      })
  }

  await app.listen(port, address)
}

await bootstrap()
