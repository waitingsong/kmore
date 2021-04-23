# [kmore](https://waitingsong.github.io/kmore/)

A SQL query builder based on [Knex](https://knexjs.org/) with powerful TypeScript type support.


[![GitHub tag](https://img.shields.io/github/tag/waitingsong/kmore.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
![](https://img.shields.io/badge/lang-TypeScript-blue.svg)
[![ci](https://github.com/waitingsong/kmore/workflows/ci/badge.svg)](https://github.com/waitingsong/kmore/actions)
[![Build Status](https://travis-ci.org/waitingsong/kmore.svg?branch=master)](https://travis-ci.org/waitingsong/kmore)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)


## Features
- Type-safe property of tables accessor 
- Type-safe join table easily
- Type-safe auto-completion in IDE


## Installation
```sh
npm install kmore kmore-cli knex

# Then add one of the following:
npm install pg
npm install mssql
npm install oracle
npm install sqlite3
```

## Basic usage

### Build configuration:

Edit the `package.json`
```json
{
  "script": {
    "db:gen": "kmore gen --path src/ test/"
  },
}
```

### Create connection
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

### Create tables with instance of knex
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

### Inert rows via auto generated table accessor
```ts
// auto generated accessort tb_user() and tb_user_detail() on km.rb
const { ref_tb_user, ref_tb_user_detail } = km.refTables

await ref_tb_user()
  .insert([
    { name: 'user1', ctime: new Date() }, // ms
    { name: 'user2', ctime: 'now()' }, // μs
  ])
  .then()

const affectedRows = await ref_tb_user_detail()
  .insert([
    { uid: 1, age: 10, address: 'address1' },
    { uid: 2, age: 10, address: 'address1' },
  ])
  .returning('*')
  .then()
```

### Join tables
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

More examples of join see [joint-table](https://github.com/waitingsong/kmore/blob/master/packages/kmore/test/join-table/71.advanced.test.ts)


### Use instance of knex
```ts
// drop table
await km.dbh.raw(`DROP TABLE IF EXISTS "${tb}" CASCADE;`).then()

// disconnect
await km.dbh.destroy()
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

[kmore-svg]: https://img.shields.io/npm/v/kmore.svg?maxAge=7200
[kmore-ch]: https://github.com/waitingsong/kmore/tree/master/packages/kmore/CHANGELOG.md
[kmore-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore
[kmore-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore
[kmore-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore
[kmore-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore#info=devDependencies

[types-svg]: https://img.shields.io/npm/v/kmore-types.svg?maxAge=7200
[types-ch]: https://github.com/waitingsong/kmore/tree/master/packages/kmore-types/CHANGELOG.md
[types-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-types
[types-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-types
[types-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore-types
[types-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore-types#info=devDependencies

[cli-svg]: https://img.shields.io/npm/v/kmore-cli.svg?maxAge=7200
[cli-ch]: https://github.com/waitingsong/kmore/tree/master/packages/kmore-clie/CHANGELOG.md
[cli-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-cli
[cli-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/kmore-cli
[cli-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/kmore-cli
[cli-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/kmore-cli#info=devDependencies


[egg-svg]: https://img.shields.io/npm/v/egg-kmore.svg?maxAge=7200
[egg-ch]: https://github.com/waitingsong/kmore/tree/master/packages/egg-kmore/CHANGELOG.md
[egg-d-svg]: https://david-dm.org/waitingsong/kmore.svg?path=packages/egg-kmore
[egg-d-link]: https://david-dm.org/waitingsong/kmore.svg?path=packages/egg-kmore
[egg-dd-svg]: https://david-dm.org/waitingsong/kmore/dev-status.svg?path=packages/egg-kmore
[egg-dd-link]: https://david-dm.org/waitingsong/kmore?path=packages/egg-kmore#info=devDependencies
