import assert from 'node:assert'


export function genKmoreTrxId(
  idOrParentId?: PropertyKey,
  suffix?: string,
): symbol {

  if (! idOrParentId) {
    const str = `trx-${Date.now().toString()}` + (suffix ? `-${suffix}` : '')
    return Symbol(str)
  }
  else if (typeof idOrParentId === 'string' || typeof idOrParentId === 'number') {
    const str = idOrParentId.toString() + Date.now().toString() + (suffix ? `-${suffix}` : '')
    return Symbol(str)
  }
  else {
    const str = idOrParentId.toString()
    let key2 = ''
    if (str.startsWith('Symbol(')) {
      const key = /Symbol\((\S+)\)/u.exec(str)?.[1]
      assert(key, 'retrieve key from id failed, input should like "Symbol(***-1234567890)"')
      key2 = `${key}-${Date.now().toString()}`
    }
    else if (str.startsWith('trx-')) {
      key2 = str
    }
    else {
      key2 = `trx-${str}`
    }

    const key3 = suffix ? `${key2}-${suffix}` : `${key2}-${Date.now().toString()}`
    assert(key3 !== str, 'result should not equal to the input id')
    return Symbol(key3)
  }
}

