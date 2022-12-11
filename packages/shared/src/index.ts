/* 公共函数 */

/* 判断数据类型 */
export const isObject = (value) => typeof value == 'object' && value !== null // 是否是对象类型
export const isArray = Array.isArray
export const isFunction = (value) => typeof value == 'function'
export const isNumber = (value) => typeof value == 'number'
export const isString = (value) => typeof value == 'string'
export const isIntegerKey = (key) => parseInt(key) + '' === key // 判断是否是数组索引

let hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (target, key) => hasOwnProperty.call(target, key) // 判断对象是否有该属性

export const hasChanged = (oldValue, value)=> oldValue !== value // 判断旧值和新修改的值，是否相等

export const extend = Object.assign // 合并对象