import camelcaseKeys from 'camelcase-keys'
import { toSnake } from 'convert-keys'

export const toCamelcase = (obj: any) => {
  try {
    return camelcaseKeys(obj, {
      deep: true,
    })
  } catch (error) {
    console.error(error)
  }
  return undefined
}

export const toSnakeCase = (obj: any) => {
  try {
    return toSnake(obj)
  } catch (error) {
    console.error(error)
  }
  return undefined
}
