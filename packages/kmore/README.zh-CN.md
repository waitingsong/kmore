# [kmore](https://waitingsong.github.io/kmore/)

基于 [Knex](https://knexjs.org/) 的 SQL 查询生成器工厂，
根据参数类型自动生成库表访问对象，
用于 Node.js。


[![Version](https://img.shields.io/npm/v/kmore.svg)](https://www.npmjs.com/package/kmore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/badge/lang-TypeScript-blue.svg)
[![Build Status](https://travis-ci.org/waitingsong/kmore.svg?branch=master)](https://travis-ci.org/waitingsong/kmore)
[![Build status](https://ci.appveyor.com/api/projects/status/nkseik96p23fcvpm/branch/master?svg=true)](https://ci.appveyor.com/project/waitingsong/kmore/branch/master)
[![Coverage Status](https://coveralls.io/repos/github/waitingsong/kmore/badge.svg?branch=master)](https://coveralls.io/github/waitingsong/kmore?branch=master)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)


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
 *      eg. db.dbh<OtherType>('tb_other').select()
 *    - db.tables : tables name accessor containing table key/value paris
 *    - db.rb : tables builder accessor,   
 *      eg. db.rb.user() =>  Knex.QueryBuilder<{id: number, name: string}>
 */
const db = kmore<TbListModel>(config)

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
const { tables: t, rb } = db

await rb.tb_user()
  .select(`${t.tb_user}.uid`, `${t.tb_user}.name`)
  .innerJoin(
    t.tb_user_detail,
    `${t.tb_user}.uid`,
    `${t.tb_user_detail}.uid`,
  )
  .where(`${t.tb_user}.uid`, 1)
  .then((rows) => {
    assert(rows && rows.length === 1 && rows[0].uid === 1)
    return rows
  })
  .catch((err: Error) => {
    assert(false, err.message)
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


## License
[MIT](LICENSE)


### Languages
- [English](README.md)
- [中文](README.zh-CN.md)
