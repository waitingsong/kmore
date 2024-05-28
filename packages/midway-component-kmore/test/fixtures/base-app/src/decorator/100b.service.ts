import { Inject } from '@midwayjs/core'

import { Transactional } from '../../../../../dist/index.js'

import { UserRepo100 as UserRepo100 } from './100c.repo.js'


@Transactional()
export class UserService100 {

  @Inject() repo: UserRepo100


  @Transactional()
  async delete(): Promise<void> {
    await this.repo.delUserAllThrowError()
  }

}

