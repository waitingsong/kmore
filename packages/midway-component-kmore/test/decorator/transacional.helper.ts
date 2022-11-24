import assert from 'node:assert/strict'


export function validateRespOK(resp: any): void {
  assert(resp)
  assert(typeof resp.text === 'string')
  assert(resp.text === 'OK')
}
