# [kmore](https://waitingsong.github.io/kmore/)

基于 [Knex](https://knexjs.org/) 的 SQL 查询生成器工厂，
提供高级 TypeScript 类型支持。


[![GitHub tag](https://img.shields.io/github/tag/waitingsong/kmore.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/badge/lang-TypeScript-blue.svg)
[![ci](https://github.com/waitingsong/kmore/workflows/ci/badge.svg)](https://github.com/waitingsong/kmore/actions)
[![codecov](https://codecov.io/gh/waitingsong/kmore/branch/main/graph/badge.svg?token=wNYqpmseCn)](https://codecov.io/gh/waitingsong/kmore)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)


## 特性
- 类型安全的表对象操作
- 类型安全的表连接操作
- 类型安全的 IDE 编辑器自动完成

## 安装
```sh
npm install kmore kmore-cli knex

# Then add one of the following:
npm install pg
npm install mssql
npm install oracle
npm install sqlite3
```

## 基础应用

### Build configuration:

Edit the `package.json`
```json
{
  "script": {
    "build": "tsc -b && npm run db:gen",
    "db:gen": "kmore gen --path src/ test/",
    "db:gen-cjs": "kmore gen --path src/ test/ --format cjs"
  },
}
```
### 创建数据库连接
```ts
import { KnexConfig, kmoreFactory, genDbDict } from 'kmore'

// connection config
export const config: KnexConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'foo',
    database: 'db_ci_test',
  },
}

// Define database model
export interface Db {
  tb_user: UserDo
  tb_user_ext: UserExtDo
}

export interface UserDo {
  uid: number
  name: string
  ctime: Date
}
export interface UserExtDo {
  uid: number
  age: number
  address: string
}  

const dict = genDbDict<Db>()
export const km = kmoreFactory({ config, dict })
```

### 建表
```ts
await km.dbh.schema
  .createTable('tb_user', (tb) => {
    tb.increments('uid')
    tb.string('name', 30)
    tb.timestamp('ctime', { useTz: false })
  })
  .createTable('tb_user_ext', (tb) => {
    tb.integer('uid')
    tb.foreign('uid')
      .references('tb_user.uid')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    tb.integer('age')
    tb.string('address', 255)
  })
  .catch((err: Error) => {
    assert(false, err.message)
  })
```

### 插入数据

#### Snake style
```ts
// auto generated accessort tb_user() and tb_user_detail()
const { ref_tb_user, ref_tb_user_detail } = km.refTables

await ref_tb_user()
  .insert([
    { user_name: 'user1', ctime: new Date() }, // ms
    { user_name: 'user2', ctime: 'now()' }, // μs
  ])
  .then()

const affectedRows = await ref_tb_user_detail()
  .insert([
    { uid: 1, age: 10, user_address: 'address1' },
    { uid: 2, age: 10, user_address: 'address1' },
  ])
  .returning('*')
  .then()
```

#### Camel style
```ts
import { RecordCamelKeys } from '@waiting/shared-types'

// auto generated accessort tb_user() and tb_user_detail() 
const { ref_tb_user, ref_tb_user_detail } = km.camelTables

interface UserDO {
  user_name: string
  ctime: date | string
}
type UserDTO = RecordCamelKeys<UserDO>

const users: UserDTO[] = await ref_tb_user()
  .insert([
    { userName: 'user1', ctime: new Date() }, // ms
    { userName: 'user2', ctime: 'now()' }, // μs
  ])
  .returning('*')
  .then()
```

### 连表
```ts
const { refTables } = km
const { tables, scoped } = km.dict

const ret = await refTables.ref_tb_user()
  .innerJoin<UserExtDo>(
  tables.tb_user_ext,
  scoped.tb_user.uid,
  scoped.tb_user_ext.uid,
)
  .select('*')
  .where(scoped.tb_user.uid, 1)

const cols = [
  alias.tb_user.uid, // { tbUser: 'tb_user.uid' }
  alias.tb_user_ext.uid, // { tbUserExt: 'tb_user_ext.uid' }
]

// --------------

type CT = DbDictType<Db>
type CT_USER = CT['tb_user']
type CT_USER_EXT = CT['tb_user_ext']

const ret = await refTables.ref_tb_user()
  .innerJoin<CT_USER & CT_USER_EXT>(
  tables.tb_user_ext,
  scoped.tb_user.uid,
  scoped.tb_user_ext.uid,
)
  .columns(cols)
  .then(rows => rows[0])


const cols = {
  uid: scoped.tb_user.uid,
  foo: scoped.tb_user_ext.uid,
}

const ret = await refTables.ref_tb_user()
  .innerJoin<CT_USER & CT_USER_EXT>(
  tables.tb_user_ext,
  scoped.tb_user.uid,
  scoped.tb_user_ext.uid,
)
  .columns(cols)
  .then(rows => rows[0])
```

More examples of join see [joint-table](https://github.com/waitingsong/kmore/blob/main/packages/kmore/test/join-table/71.advanced.test.ts)


### 使用 knex
```ts
// drop table
await km.dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()

// disconnect
await km.dbh.destroy()
```

## Midway.js component

```ts

@Provide()
export class UserRepo {
  @Inject() readonly ctx: Context
  @Inject() dbManager: DbSourceManager<'master' | 'slave', Db>

  async getUser(uid: number): Promise<UserDTO[]> {
    const db = this.dbManager.getDataSource('master')
    assert(db)

    const { ref_tb_user } = db.camelTables
    const user = await ref_tb_user(this.ctx)
      .select('*')
      .where({ uid })
    return user
  }
}
```


## Demo
- [see test](https://github.com/waitingsong/kmore/blob/main/test/)


## Packages

kmore is comprised of many specialized packages.
This repository contains all these packages. Below you will find a summary of each package.

| Package                    | Version                  |
| -------------------------- | ------------------------ |
| [`kmore`]                  | [![kmore-svg]][kmore-ch] |
| [`kmore-types`]            | [![types-svg]][types-ch] |
| [`kmore-cli`]              | [![cli-svg]][cli-ch]     |
| [`midway-component-kmore`] | [![mw-svg]][mw-ch]       |



## License
[MIT](LICENSE)


### Languages
- [English](README.md)
- [中文](README.zh-CN.md)


[`kmore`]: https://github.com/waitingsong/kmore/tree/main/packages/kmore
[`kmore-types`]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-types
[`kmore-cli`]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-cli
[`midway-component-kmore`]: https://github.com/waitingsong/kmore/tree/main/packages/midway-component-kmore

[kmore-svg]: https://img.shields.io/npm/v/kmore.svg?maxAge=7200
[kmore-ch]: https://github.com/waitingsong/kmore/tree/main/packages/kmore/CHANGELOG.md
[kmore-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore
[kmore-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore
[kmore-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore
[kmore-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore#info=devDependencies

[types-svg]: https://img.shields.io/npm/v/kmore-types.svg?maxAge=7200
[types-ch]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-types/CHANGELOG.md
[types-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-types
[types-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-types
[types-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore-types
[types-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore-types#info=devDependencies

[cli-svg]: https://img.shields.io/npm/v/kmore-cli.svg?maxAge=7200
[cli-ch]: https://github.com/waitingsong/kmore/tree/main/packages/kmore-clie/CHANGELOG.md
[cli-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-cli
[cli-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-cli
[cli-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore-cli
[cli-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore-cli#info=devDependencies


[mw-svg]: https://img.shields.io/npm/v/@mw-components/kmore.svg?maxAge=7200
[mw-ch]: https://github.com/waitingsong/kmore/tree/main/packages/midway-component-kmore/CHANGELOG.md
[mw-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/midway-component-kmore
[mw-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/midway-component-kmore
[mw-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/midway-component-kmore
[mw-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/egg-kmore#info=midway-component-kmore

