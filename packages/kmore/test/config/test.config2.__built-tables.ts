/* eslint-disable */

export const tbs_4_24_tables = {
  "tb_user": "tb_user",
  "tb_user_detail": "tb_user_detail"
} as const

export const tbs_4_24_columns = {
  "tb_user": {
    "uid": "uid",
    "name": "name"
  },
  "tb_user_detail": {
    "uid": "uid",
    "age": "age",
    "address": "address"
  }
} as const


export interface Db {
  tb_user: {
    tbUserUid: number,
    tbUserName: string,
  }
  tb_user_detail: {
    tbUserDetailUid: number,
    tbUserDetailAge: number,
    tbUserDetailAddress: string,
  }
}
export const tbs_0_0_aliasColumns = {
  "tb_user": {
    "uid": {
      "tbUserUid": "tb_user.uid",
    },
    "name": {
      "tbUserName": "tb_user.name",
    }
  },
  "tb_user_detail": {
    "uid": {
      "tbUserDetailUid": "tb_user_detail.uid",
    },
    "age": {
      "tbUserDetailAge": "tb_user_detail.age",
    },
    "address": {
      "tbUserDetailAddress": "tb_user_detail.address",
    }
  }
} as const

