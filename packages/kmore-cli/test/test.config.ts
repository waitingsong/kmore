/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// @ts-ignore fake import
import { genTbListFromType, kmore, config, DbModel } from 'kmore'


genTbListFromType<DbAlias>()

export const tbList = genTbListFromType<Db>()

export const db = kmore<Db>(config)

interface Db extends DbModel {
  user: string
  userDetail: string
}

type DbAlias = Db

