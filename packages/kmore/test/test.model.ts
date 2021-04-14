
export class Db {
  tb_user: UserDo
  tb_user_ext: UserExtDo
}

/**
 * @description User用户表字段定义
 */
export class UserDo {
  uid: number
  name: string
  ctime: Date | 'now()'
}

export class UserExtDo {
  uid: number
  age: number
  address: string | number
}

