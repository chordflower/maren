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

import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { each } from 'lodash-es'
import { ClsModule } from 'nestjs-cls'
import { LoggerModule } from 'nestjs-pino'
import { TransportTargetOptions } from 'pino'
import toDotCase from 'to-dot-case'
import { v7 } from 'uuid'

/**
 * This is the main app module
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: (config: Record<string, any>) => {
        const result: Record<string, any> = {}
        // Turns a string from CAPITAL_CASE into capital.case (aka dot.case)
        each(config, (value: any, key: string) => {
          result[toDotCase(key)] = value
        })
        return result
      },
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req) => {
          const result = (req.id as string | undefined) ?? (req.headers['X-Request-Id'] as string | undefined) ?? v7()
          return result
        },
      },
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Stdout output is always on...
        const targets: Array<TransportTargetOptions> = [
          {
            target: 'pino-pretty',
            options: {
              destination: 1,
            },
          },
        ]

        // If logtail is enabled, configure it
        if ('true' === config.get<string>('logtail.enabled', 'false')) {
          console.log('adding logtail')
          targets.push({
            level: 'info',
            target: '@logtail/pino',
            options: {
              sourceToken: config.getOrThrow<string>('logtail.token'),
            },
          })
        }

        // If axiom is enabled, configure it
        if ('true' === config.get<string>('axiom.enabled', 'false')) {
          console.log('adding axiom')
          targets.push({
            level: 'info',
            target: 'pino-axiom',
            options: {
              orgId: config.getOrThrow<string>('axiom.org.id'),
              token: config.getOrThrow<string>('axiom.token'),
              dataset: config.getOrThrow<string>('axiom.dataset'),
            },
          })
        }

        return {
          pinoHttp: {
            genReqId: (req: any): string => req.id ?? req.headers['X-Request-Id'] ?? v7(),
            transport: {
              targets: targets,
            },
          },
        }
      },
    }),
  ],
})
export class AppModule {}
