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
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import 'dotenv/config'
import { readFile, writeFile } from 'fs/promises'
import { Logger } from 'nestjs-pino'
import * as ocsp from 'ocsp'
import { v7 } from 'uuid'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { AppModule } from './app.module.js'
import { author, license, version } from './utils/package.js'

async function bootstrap() {
  const fastifyAdapterOptions: any = {
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
  }
  if ('true' === process.env['TLS_ENABLED']) {
    fastifyAdapterOptions.https = {
      key: (await readFile(new URL(process.env['TLS_KEY'] ?? '', import.meta.url), 'utf8')).replace(/\\n/g, '\n'),
      cert: (await readFile(new URL(process.env['TLS_CERTIFICATE'] ?? '', import.meta.url), 'utf8')).replace(
        /\\n/g,
        '\n',
      ),
      minVersion: 'TLSv1.3',
    }
    fastifyAdapterOptions.http2 = true
  }
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(fastifyAdapterOptions), {
    bufferLogs: true,
  })
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

await yargs(hideBin(process.argv))
  .usage('$0')
  .command({
    command: 'serve',
    aliases: ['$0'],
    describe: 'Runs the server',
    handler: async () => {
      await bootstrap()
    },
  })
  .command({
    command: 'openapi',
    describe: 'Generates the openapi json',
    builder: {
      output: {
        alias: 'o',
        demandOption: true,
        type: 'string',
        normalize: true,
        describe: 'The output file to use',
      },
    },
    handler: async (args) => {
      const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
          logger: false,
        }),
        { logger: false },
      )

      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('Maren API')
          .setDescription('The maren API description')
          .setVersion(version)
          .setLicense(license, 'https://www.gnu.org/licenses/agpl-3.0.en.html')
          .setContact(author.name, author.url, author.email)
          .addTag('utils', 'Some utility operations')
          .build(),
        {
          operationIdFactory: (_, method) => method,
        },
      )

      await writeFile(args.output, JSON.stringify(document, undefined, 2))
    },
  })
  .parse()
