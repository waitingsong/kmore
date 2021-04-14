import { DbDict } from 'kmore-types'

import { Db, Db2 } from './types'


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
  aliasColumns: {
    tb_user: {
      tbUserUid: 'tb_user.uid',
      tbUserName: 'tb_user.name',
      tbUserCtime: 'tb_user.ctime',
    },
    tb_user_ext: {
      tbUserExtUid: 'tb_user_ext.uid',
      tbUserExtAge: 'tb_user_ext.age',
      tbUserExtAddress: 'tb_user_ext.address',
    },
  },
  scopedColumns: {
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
}


export const expectedDict2: DbDict<Db2> = {
  tables: {
    tb_user: 'tb_user',
    tb_user_ext: 'tb_user_ext',
    tb_order: 'tb_order',
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
    tb_order: {
      order_id: 'order_id',
      order_name: 'order_name',
    },
  },
  aliasColumns: {
    tb_user: {
      tbUserUid: 'tb_user.uid',
      tbUserName: 'tb_user.name',
      tbUserCtime: 'tb_user.ctime',
    },
    tb_user_ext: {
      tbUserExtUid: 'tb_user_ext.uid',
      tbUserExtAge: 'tb_user_ext.age',
      tbUserExtAddress: 'tb_user_ext.address',
    },
    tb_order: {
      tbOrderOrderId: 'tb_order.order_id',
      tbOrderOrderName: 'tb_order.order_name',
    },
  },
  scopedColumns: {
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
    tb_order: {
      order_id: 'tb_order.order_id',
      order_name: 'tb_order.order_name',
    },
  },
}

