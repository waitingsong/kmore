# [kmore](https://waitingsong.github.io/kmore/)

基于 [Knex](https://knexjs.org/) 的 SQL 查询生成器工厂，
根据参数类型自动生成库表访问对象，
用于 Node.js。


[![GitHub tag](https://img.shields.io/github/tag/waitingsong/kmore.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/badge/lang-TypeScript-blue.svg)
[![Node CI](https://github.com/waitingsong/kmore/workflows/Node%20CI/badge.svg)](https://github.com/waitingsong/kmore/actions)
[![Build Status](https://travis-ci.org/waitingsong/kmore.svg?branch=master)](https://travis-ci.org/waitingsong/kmore)
[![Build status](https://ci.appveyor.com/api/projects/status/nkseik96p23fcvpm/branch/master?svg=true)](https://ci.appveyor.com/project/waitingsong/kmore/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/waitingsong/kmore/badge.svg?branch=master)](https://coveralls.io/github/waitingsong/kmore?branch=master)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

## 安装
```sh
npm install kmore knex

# Then add one of the following:
npm install pg
npm install mssql
npm install oracle
npm install sqlite3
```

## 使用

### Build configuration:
Ensure `sourceMap` or `inlineSourceMap` is true in the tsconfig.json
```json
{
  "compilerOptions": {
    "sourceMap": true
  },
}
```

### 创建数据库连接
```ts
import { Config } from 'kmore'

// connection config
export const config: Config = {
  client: 'pg',
  // connection: process.env.PG_CONNECTION_STRING,
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'foo',
    database: 'db_ci_test',
  },
}

// Define Types of tables
export interface TbListModel {
  tb_user: User
  tb_user_detail: UserDetail
}

export interface User {
  uid: number
  name: string
  ctime: Date | 'now()'
}
export interface UserDetail {
  uid: number
  age: number
  address: string
}  

/**
 *  Initialize db connection and generate type-safe tables accessor (name and builder)
 *  will get
 *    - db.dbh : the connection instance of knex
 *        eg. db.dbh<OtherType>('tb_other').select()
 *    - db.tables : tables name accessor containing table key/value paris
 *    - db.columns : table column names accessor containing table key/value paris
 *    - db.scopedColumns : table column names accessor containing table key/value paris, with table prefix
 *    - db.rb : tables builder accessor,
 *        eg. db.rb.user() =>  Knex.QueryBuilder<{id: number, name: string}>
 *  tables will be generated from generics automaitically when passing undefined or null value
 */
const db = kmore<TbListModel>({ config })
// or
const kTables = genTbListFromType<TbListModel>()
const db = kmore<TbListModel>({ config }, kTables)

```

### 建表
```ts
await db.dbh.schema
  .createTable('tb_user', (tb) => {
    tb.increments('uid')
    tb.string('name', 30)
    tb.timestamp('ctime', { useTz: false })
  })
  .createTable('tb_user_detail', (tb) => {
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
```ts
// auto generated accessort tb_user() and tb_user_detail() on db.rb
const { tb_user, tb_user_detail } = db.rb

await tb_user()
  .insert([
    { name: 'user1', ctime: new Date() }, // ms
    { name: 'user2', ctime: 'now()' }, // μs
  ])
  .then()

await tb_user_detail()
  .insert([
    { uid: 1, age: 10, address: 'address1' },
    { uid: 2, age: 10, address: 'address1' },
  ])
  .returning('*')
  .then()
```

### 连表
```ts
const { tables: t, rb, scopedColumns: sc } = db

await rb.tb_user<UserDetail>()
  .select()
  .innerJoin(
    t.tb_user_detail,
    sc.tb_user.uid,
    sc.tb_user_detail.uid,
  )
  .where(sc.tb_user.uid, 1)
  .then((rows) => {
    const [row] = rows
    assert(row && row.uid)
    assert(row && row.name)
    assert(row && row.age)
    return rows
  })
```

### 使用 knex
```ts
// drop table
await db.dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()

// disconnect
await db.dbh.destroy()
```


## Demo
- [see test](https://github.com/waitingsong/kmore/blob/master/test/)


## Packages

kmore is comprised of many specialized packages.
This repository contains all these packages. Below you will find a summary of each package.

| Package         | Version                  | Dependencies                   | DevDependencies                  |
| --------------- | ------------------------ | ------------------------------ | -------------------------------- |
| [`kmore`]       | [![kmore-svg]][kmore-ch] | [![kmore-d-svg]][kmore-d-link] | [![kmore-dd-svg]][kmore-dd-link] |
| [`kmore-types`] | [![types-svg]][types-ch] | [![types-d-svg]][types-d-link] | [![types-dd-svg]][types-dd-link] |
| [`kmore-cli`]   | [![cli-svg]][cli-ch]     | [![cli-d-svg]][cli-d-link]     | [![cli-dd-svg]][cli-dd-link]     |
| [`egg-kmore`]   | [![egg-svg]][egg-ch]     | [![egg-d-svg]][egg-d-link]     | [![egg-dd-svg]][egg-dd-link]     |



## License
[MIT](LICENSE)


### Languages
- [English](README.md)
- [中文](README.zh-CN.md)


[`kmore`]: https://github.com/waitingsong/kmore/tree/master/packages/kmore
[`kmore-types`]: https://github.com/waitingsong/kmore/tree/master/packages/kmore-types
[`kmore-cli`]: https://github.com/waitingsong/kmore/tree/master/packages/kmore-cli
[`egg-kmore`]: https://github.com/waitingsong/kmore/tree/master/packages/egg-kmore

[kmore-svg]: https://img.shields.io/npm/v/kmore.svg?maxAge=86400
[kmore-ch]: https://github.com/waitingsong/kmore/tree/master/packages/kmore/CHANGELOG.md
[kmore-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore
[kmore-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore
[kmore-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore
[kmore-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore#info=devDependencies

[types-svg]: https://img.shields.io/npm/v/kmore-types.svg?maxAge=86400
[types-ch]: https://github.com/waitingsong/kmore/tree/master/packages/kmore-types/CHANGELOG.md
[types-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-types
[types-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-types
[types-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore-types
[types-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore-types#info=devDependencies

[cli-svg]: https://img.shields.io/npm/v/kmore-cli.svg?maxAge=86400
[cli-ch]: https://github.com/waitingsong/kmore/tree/master/packages/kmore-clie/CHANGELOG.md
[cli-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-cli
[cli-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-cli
[cli-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore-cli
[cli-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore-cli#info=devDependencies


[egg-svg]: https://img.shields.io/npm/v/egg-kmore.svg?maxAge=86400
[egg-ch]: https://github.com/waitingsong/kmore/tree/master/packages/egg-kmore/CHANGELOG.md
[egg-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/egg-kmore
[egg-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/egg-kmore
[egg-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/egg-kmore
[egg-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/egg-kmore#info=devDependencies
