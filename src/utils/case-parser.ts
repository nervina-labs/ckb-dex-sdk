import camelcaseKeys from 'camelcase-keys'
import { toSnake } from 'convert-keys'

export const toCamelcase = (object: any) => {
  try {
    return JSON.parse(
      JSON.stringify(
        camelcaseKeys(object, {
          deep: true,
        }),
      ),
    )
  } catch (error) {
    console.error(error)
  }
  return null
}

export const toSnakeCase = (object: any) => {
  try {
    return JSON.parse(JSON.stringify(toSnake(object)))
  } catch (error) {
    console.error(error)
  }
  return null
}
