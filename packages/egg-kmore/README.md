# [egg-kmore](https://waitingsong.github.io/egg-kmore/)

[kmore](https://www.npmjs.com/package/kmore) for midway framework.


[![Version](https://img.shields.io/npm/v/egg-kmore.svg)](https://www.npmjs.com/package/egg-kmore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/badge/lang-TypeScript-blue.svg)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)


## Installation
```sh
npm install egg-kmore knex

# Then add one of the following:
npm install pg
npm install mssql
npm install oracle
npm install sqlite3
```


## Configuration

### Enable Plugin

Edit `${app_root}/src/config/plugin.ts`:

```ts
import { EggPlugin } from 'midway'

export default {
  kmore: {
    enable: true,
    package: 'egg-kmore',
  },
} as EggPlugin
```

### Add Configurations

Edit `${app_root}/src/config/config.${env}.ts`:
```ts
import { EggKmoreConfig, genTbListFromType, ClientOpts } from 'egg-kmore'
import { TbListModel } from '../app/user/user.model'

const master: ClientOpts = {
  knexConfig: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'postgres',
      password: '',
      database: 'db_ci_test',
    },
    acquireConnectionTimeout: 10000,
  },
  tables: genTbListFromType<TbListModel>(),
}

// app: default true
export const kmore: EggKmoreConfig = {
  client: master,
}


/* location: ../app/user/user.model.ts */
export interface TbListModel {
  tb_user: User
  tb_user_detail: UserDetail
}

/**
 * user info
 */
export interface UserInfo extends User, UserDetail {
}

export interface User {
  uid: number
  user_name: string
}
export interface UserDetail {
  uid: number
  phone: string
  email: string
}

export interface GetUserOpts {
  uid: number
}
```


## Usage

```ts
/* location: ../app/user/service.model.ts */

import { provide, plugin } from 'midway'
import { DbModel } from 'egg-kmore'
import { GetUserOpts, UserInfo, User, TbListModel } from './user.model'

@provide()
export class UserService {

  constructor(
    @plugin('kmore') private readonly db: DbModel<TbListModel>,
  ) { }

  /**
   * Read user info
   */
  public async getUser(options: GetUserOpts): Promise<UserInfo> {
    const { rb, tables: t } = this.db

    const row: UserInfo = await rb.tb_user()
      .innerJoin(
        t.tb_user_detail,
        `${t.tb_user}.uid`,
        `${t.tb_user_detail}.uid`,
      )
      .select('*')
      .where(`${t.tb_user}.uid`, options.uid)
      .then(rows => rows[0])

    return row
  }

  /**
   * Read user_name
   */
  public async getUserName(options: GetUserOpts): Promise<User['user_name']> {
    const { rb } = this.db

    const name = await rb.tb_user()
      .select('user_name')
      .where('uid', options.uid)
      .then(rows => rows[0] ? rows[0].user_name : '')

    return name
  }

}
```

## Generating source files pre build

The files generated automatically under typescript environment for debug or test 

```sh
cd ${app_root}
kmore gen --path ./src

// then you could build the project
npm run build
```


## License
[MIT](LICENSE)


### Languages
- [English](README.md)
- [中文](README.zh-CN.md)
