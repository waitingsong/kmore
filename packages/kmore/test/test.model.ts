import { RecordCamelKeys } from '@waiting/shared-types'


export class Db {
  tb_user: UserDo
  tb_user_ext: UserExtDo
  tb_order: OrderDo
}

/**
 * @description User用户表字段定义
 */
export class UserDo {
  uid: number
  name: string
  real_name: string
  ctime: Date | 'now()'
}

export class UserExtDo {
  uid: number
  age: number
  address: string | number
}

export class OrderDo {
  order_id: string | bigint
  order_name: string
  uid: number
  ctime: Date | 'now()'
}

export type UserDTO = RecordCamelKeys<UserDo>

export interface Context {
  uid: number
  ver: string
}

