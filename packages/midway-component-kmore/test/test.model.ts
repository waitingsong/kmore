import type { RecordCamelKeys } from '@waiting/shared-types'


export class Db {

  tb_user: UserDO
  tb_user_ext: UserExtDO

}
export class Db2 {

  tb_user_ext: UserExtDO

}

/**
 * @description User用户表字段定义
 */
export class UserDO {

  uid: number
  name: string
  real_name: string
  ctime: Date | 'now()'

}

export class UserExtDO {

  uid: number
  age: number
  address: string | number
  salary: string | number

}


export type UserDTO = RecordCamelKeys<UserDO>
export type UserExtDTO = RecordCamelKeys<UserExtDO>

