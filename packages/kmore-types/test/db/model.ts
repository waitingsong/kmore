import { TableModel, DbModel } from '../../src'


export interface Db extends DbModel {
  tb_user: User
  tb_user_detail: UserDetail
  tb_thread: Thread
  tb_post: Post
  tb_attach: Attach
}

interface User {
  uid: number
  name: string
  is_available: boolean
  real_name: string
  pwd: string
  reg_date: string
  reg_ip: string
  last_ip: string
  last_date: string
  ctime: Date | 'now()'
  mtime: Date | string
}
interface UserDetail {
  uid: number
  age: number
  avatar: string
  gender: number
  weight: number
  height: number
  length: number
  address: string
  qq: string
  wx: string
  icq: string
  msn: string
  facebook: string
  github: string
  gitlab: string
  ctime: Date | 'now()'
  mtime: Date | string
}
interface Thread {
  tid: number
  uid: number
  title: string
  content: string
  keyword: string
  fts: string
  read_lever: number
  is_hidden: boolean
  ctime: Date | 'now()'
  mtime: Date | string
}
interface Post {
  pid: number
  tid: number
  uid: number
  title: string
  content: string
  keyword: string
  fts: string
  read_lever: number
  is_hidden: boolean
  ctime: Date | 'now()'
  mtime: Date | string
}
interface Attach {
  aid: number
  uid: number | null
  tid: number | null
  pid: number | null
  file_deleted: boolean
  file_ori_name: string
  file_name: string
  file_ext: string
  file_mime: string
  file_size: number
  file_date: string
  file_path: string
  file_hash: string
  is_img: number
  thumb1: string
  thumb2: string
  thumb3: string
  ctime: Date | 'now()'
  mtime: Date | string
}


