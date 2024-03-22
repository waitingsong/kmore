import assert from 'node:assert'


export function genKmoreTrxId(
  id?: PropertyKey,
  suffix?: string,
): symbol {

  if (! id) {
    const str = `trx-${Date.now().toString()}` + (suffix ? `-${suffix}` : '')
    return Symbol(str)
  }
  else if (typeof id === 'string' || typeof id === 'number') {
    const str = id.toString() + Date.now().toString() + (suffix ? `-${suffix}` : '')
    return Symbol(str)
  }

  const str = id.toString()
  let key2 = ''
  if (str.startsWith('Symbol(trx-')) {
    const key = str.match(/Symbol\((trx-\S+)\)/u)?.[1]
    assert(key, 'retrieve key from id failed, input should like "Symbol(trx-1234567890)"')
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

