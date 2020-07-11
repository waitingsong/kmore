
const tables = {
  tb_user: 'tb_user',
  tb_user_detail: 'tb_user_detail',
} as const

const columns = {
  tb_user: {
    uid: 'uid',
    name: 'name',
    ctime: 'ctime',
  },
  tb_user_detail: {
    uid: 'uid',
    age: 'age',
    address: 'address',
  },
} as const

const aliasColumns = {
  tb_user: {
    uid: {
      tbUserUid: 'tb_user.uid',
    },
    name: {
      tbUserName: 'tb_user.name',
    },
    ctime: {
      tbUserCtime: 'tb_user.ctime',
    },
  },
  tb_user_detail: {
    uid: {
      tbUserDetailUid: 'tb_user_detail.uid',
    },
    age: {
      tbUserDetailAge: 'tb_user_detail.age',
    },
    address: {
      tbUserDetailAddress: 'tb_user_detail.address',
    },
  },
} as const

const scopedColumns = {
  tb_user: {
    uid: 'tb_user.uid',
    name: 'tb_user.name',
    ctime: 'tb_user.ctime',
  },
  tb_user_detail: {
    uid: 'tb_user_detail.uid',
    age: 'tb_user_detail.age',
    address: 'tb_user_detail.address',
  },
} as const


export const kddConst = {
  tables,
  columns,
  aliasColumns,
  scopedColumns,
}

export type KDD = typeof kddConst
export interface KDD2 {
  tables: {
    tb_user: 'tb_user',
    tb_user_detail: 'tb_user_detail',
  }

  columns: {
    tb_user: {
      uid: 'uid',
      name: 'name',
      ctime: 'ctime',
    },
    tb_user_detail: {
      uid: 'uid',
      age: 'age',
      address: 'address',
    },
  }

  aliasColumns: {
    tb_user: {
      uid: {
        tbUserUid: 'tb_user.uid',
      },
      name: {
        tbUserName: 'tb_user.name',
      },
      ctime: {
        tbUserCtime: 'tb_user.ctime',
      },
    },
    tb_user_detail: {
      uid: {
        tbUserDetailUid: 'tb_user_detail.uid',
      },
      age: {
        tbUserDetailAge: 'tb_user_detail.age',
      },
      address: {
        tbUserDetailAddress: 'tb_user_detail.address',
      },
    },
  }

  scopedColumns: {
    tb_user: {
      uid: 'tb_user.uid',
      name: 'tb_user.name',
      ctime: 'tb_user.ctime',
    },
    tb_user_detail: {
      uid: 'tb_user_detail.uid',
      age: 'tb_user_detail.age',
      address: 'tb_user_detail.address',
    },
  }
}

