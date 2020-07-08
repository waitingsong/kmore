import {
  TableAliasCols,
  KnexColumnsParma,
} from './model'


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function genKnexColumnsParam<T extends TableAliasCols = any>(
  jointTableColumns: T,
  keyArr: ((keyof T) | '*')[] | void,
  useColAliasNameAsOutputName = false,
): KnexColumnsParma {

  const ret: KnexColumnsParma = {}

  if (! keyArr || keyArr.includes('*')) {
    Object.keys(jointTableColumns).forEach((fldName) => {
      const { input, output } = jointTableColumns[fldName]
      if (! input || ! output) {
        throw new Error('Invalie in and out value')
      }
      const key = useColAliasNameAsOutputName === true ? fldName : output
      updateProps(ret, key, input)
    })
  }
  else {
    keyArr.forEach((fldName) => {
      const { input, output } = jointTableColumns[fldName]
      if (! input || ! output) {
        throw new Error('Invalie in and out value')
      }
      const key = useColAliasNameAsOutputName === true ? fldName : output
      updateProps(ret, key, input)
    })
  }

  return ret
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateProps<T extends TableAliasCols = any>(
  obj: KnexColumnsParma,
  key: keyof T,
  value: string,
): void {

  if (Object.getOwnPropertyDescriptor(obj, key)) {
    return
  }

  Object.defineProperty(obj, key, {
    configurable: false,
    enumerable: true,
    writable: true,
    value,
  })
}

