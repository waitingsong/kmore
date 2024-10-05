/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// @ts-ignore  below is fake import only for unittest!
import { type DbModel, config, genDbDictFromType, kmore } from 'kmore'


genDbDictFromType<DbAlias>()

export const dbDict = genDbDictFromType<Db>()

export const kmInst = kmore<Db>(config)

interface Db extends DbModel {
  user: {
    uid: number,
    name: string,
  }
  userDetail: {
    uid: number,
    address: string,
  }
}

type DbAlias = Db

