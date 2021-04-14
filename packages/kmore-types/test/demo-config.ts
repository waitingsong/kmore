import { DbDict, DbDictType } from '../src/index'

import { Db, Db2 } from './test3.model'


export const expectedDict: DbDict<Db> = {
  tables: {
    tb_user: 'tb_user',
    tb_user_ext: 'tb_user_ext',
  },

  columns: {
    tb_user: {
      uid: 'uid',
      name: 'name',
      ctime: 'ctime',
    },
    tb_user_ext: {
      uid: 'uid',
      age: 'age',
      address: 'address',
    },
  },

  scoped: {
    tb_user: {
      uid: 'tb_user.uid',
      name: 'tb_user.name',
      ctime: 'tb_user.ctime',
    },
    tb_user_ext: {
      uid: 'tb_user_ext.uid',
      age: 'tb_user_ext.age',
      address: 'tb_user_ext.address',
    },
  },

  alias: {
    tb_user: {
      uid: { tbUserUid: 'tb_user.uid' },
      name: { tbUserName: 'tb_user.name' },
      ctime: { tbUserCtime: 'tb_user.ctime' },
    },
    tb_user_ext: {
      uid: { tbUserExtUid: 'tb_user_ext.uid' },
      age: { tbUserExtAge: 'tb_user_ext.age' },
      address: { tbUserExtAddress: 'tb_user_ext.address' },
    },
  },
}


export const expectedDict2: DbDict<Db2> = {
  tables: {
    tb_user: 'tb_user',
    tb_user_ext: 'tb_user_ext',
  },

  columns: {
    tb_user: {
      uid: 'uid',
      name: 'name',
      ctime: 'ctime',
      pwd: 'pwd',
    },
    tb_user_ext: {
      uid: 'uid',
      age: 'age',
      address: 'address',
    },
  },

  scoped: {
    tb_user: {
      uid: 'tb_user.uid',
      name: 'tb_user.name',
      ctime: 'tb_user.ctime',
      pwd: 'tb_user.pwd',
    },
    tb_user_ext: {
      uid: 'tb_user_ext.uid',
      age: 'tb_user_ext.age',
      address: 'tb_user_ext.address',
    },
  },

  alias: {
    tb_user: {
      uid: { tbUserUid: 'tb_user.uid' },
      name: { tbUserName: 'tb_user.name' },
      ctime: { tbUserCtime: 'tb_user.ctime' },
      pwd: { tbUserPwd: 'tb_user.pwd' },
    },
    tb_user_ext: {
      uid: { tbUserExtUid: 'tb_user_ext.uid' },
      age: { tbUserExtAge: 'tb_user_ext.age' },
      address: { tbUserExtAddress: 'tb_user_ext.address' },
    },
  },
}


export const expectedColsTypeDb: DbDictType<Db> = {
  tb_user: {
    uid: 1,
    name: 'abc',
    ctime: new Date(),
    tbUserUid: 1,
    tbUserName: 'tb_user.name',
    tbUserCtime: new Date(),
    'tb_user.uid': 1,
    'tb_user.name': 'name',
    'tb_user.ctime': new Date(),
  },
  tb_user_ext: {
    uid: 1,
    age: 10,
    address: 'addr',
    tbUserExtUid: 1,
    tbUserExtAge: 11,
    tbUserExtAddress: 'address',
    'tb_user_ext.uid': 1,
    'tb_user_ext.age': 2,
    'tb_user_ext.address': 'foo',
  },
}
