import assert from 'node:assert/strict'


export function validateRespOK(resp: unknown): void {
  assert(resp)
  // @ts-expect-error
  assert(typeof resp.text === 'string')
  // @ts-expect-error
  assert(resp.text === 'OK')
}
