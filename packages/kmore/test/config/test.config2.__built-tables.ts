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


export interface TbListModel {
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

