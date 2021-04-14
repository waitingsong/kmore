
export class Db {
  tb_user: UserDo
  tb_user_ext: UserExtDo
}

export class Db2 {
  tb_user: UserDo
  tb_user_ext: UserExtDo
  tb_order: OrderDo
}

export class UserDo {
  uid: number
  name: string
  ctime: Date | string
}

export class UserExtDo {
  uid: number
  age: number
  address: string
}


export class OrderDo {
  order_id: number
  order_name: string
}

