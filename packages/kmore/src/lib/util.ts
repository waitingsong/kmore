import assert from 'node:assert'


export function genKmoreTrxId(
  id?: PropertyKey,
  suffix?: string,
): symbol {

  if (! id) {
    const str = `trx-${Date.now()}` + (suffix ? `-${suffix}` : '')
    return Symbol(str)
  }
  else if (typeof id === 'string' || typeof id === 'number') {
    const str = id.toString() + (suffix ? `-${suffix}` : '')
    return Symbol(str)
  }

  const str = id.toString()
  if (str.startsWith('Symbol(trx-')) {
    const key = str.match(/Symbol\((trx-\S+)\)/u)?.[1]
    assert(key, 'retrieve key from id failed, input should like "Symbol(trx-1234567890)"')
    const key2 = `${key}-${Date.now()}` + (suffix ? `-${suffix}` : '')
    return Symbol(key2)
  }
  else {
    const key = `trx-${str}` + (suffix ? `-${suffix}` : '')
    return Symbol(key)
  }
}

