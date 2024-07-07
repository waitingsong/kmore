import type { DbDict, DbDictType } from '../src/index.js'

import type { Db, Db2, Db3 } from './test3.model.js'


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
      last_login_time: 'last_login_time',
    },
  },

  camelColumns: {
    tb_user: {
      uid: 'uid',
      name: 'name',
      ctime: 'ctime',
    },
    tb_user_ext: {
      uid: 'uid',
      age: 'age',
      address: 'address',
      lastLoginTime: 'lastLoginTime',
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
      last_login_time: 'tb_user_ext.last_login_time',
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
      last_login_time: { tbUserExtLastLoginTime: 'tb_user_ext.last_login_time' },
    },
  },

  camelAlias: {
    tb_user: {
      uid: { uid: 'tb_user.uid' },
      name: { name: 'tb_user.name' },
      ctime: { ctime: 'tb_user.ctime' },
    },
    tb_user_ext: {
      uid: { uid: 'tb_user_ext.uid' },
      age: { age: 'tb_user_ext.age' },
      address: { address: 'tb_user_ext.address' },
      last_login_time: { lastLoginTime: 'tb_user_ext.last_login_time' },
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
      last_login_time: 'last_login_time',
    },
  },

  camelColumns: {
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
      lastLoginTime: 'lastLoginTime',
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
      last_login_time: 'tb_user_ext.last_login_time',
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
      last_login_time: { tbUserExtLastLoginTime: 'tb_user_ext.last_login_time' },
    },
  },

  camelAlias: {
    tb_user: {
      uid: { uid: 'tb_user.uid' },
      name: { name: 'tb_user.name' },
      ctime: { ctime: 'tb_user.ctime' },
      pwd: { pwd: 'tb_user.pwd' },
    },
    tb_user_ext: {
      uid: { uid: 'tb_user_ext.uid' },
      age: { age: 'tb_user_ext.age' },
      address: { address: 'tb_user_ext.address' },
      last_login_time: { lastLoginTime: 'tb_user_ext.last_login_time' },
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
    last_login_time: new Date(),
    tbUserExtUid: 1,
    tbUserExtAge: 11,
    tbUserExtAddress: 'address',
    tbUserExtLastLoginTime: new Date(),
    'tb_user_ext.uid': 1,
    'tb_user_ext.age': 2,
    'tb_user_ext.address': 'foo',
    'tb_user_ext.last_login_time': new Date(),
  },
}



export const expectedDict3: DbDict<Db3> = {
  tables: {
    vi_001_02_user: 'vi_001_02_user',
  },

  columns: {
    vi_001_02_user: {
      uid: 'uid',
      name: 'name',
      ctime: 'ctime',
    },
  },

  camelColumns: {
    vi_001_02_user: {
      uid: 'uid',
      name: 'name',
      ctime: 'ctime',
    },
  },

  scoped: {
    vi_001_02_user: {
      uid: 'vi_001_02_user.uid',
      name: 'vi_001_02_user.name',
      ctime: 'vi_001_02_user.ctime',
    },
  },

  alias: {
    vi_001_02_user: {
      uid: { vi_001_02UserUid: 'vi_001_02_user.uid' },
      name: { vi_001_02UserName: 'vi_001_02_user.name' },
      ctime: { vi_001_02UserCtime: 'vi_001_02_user.ctime' },
    },
  },

  camelAlias: {
    vi_001_02_user: {
      uid: { uid: 'vi_001_02_user.uid' },
      name: { name: 'vi_001_02_user.name' },
      ctime: { ctime: 'vi_001_02_user.ctime' },
    },
  },
}


