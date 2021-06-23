
export class Db {
  tb_user: User
  tb_user_ext: UserExt
}
export class Db2 {
  tb_user: User2
  tb_user_ext: UserExt
}

export class User {
  uid: number
  name: string
  ctime: Date | string
}
export class User2 {
  uid: number
  name: string
  ctime: Date | string
  pwd: string
}

export class UserExt {
  uid: number
  age: number
  address: string
  last_login_time: Date
}

