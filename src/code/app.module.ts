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
import { ConfigModule } from '@nestjs/config'
import { each } from 'lodash-es'
import toDotCase from 'to-dot-case'

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
  ],
})
export class AppModule {}
