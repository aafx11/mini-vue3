// 公共函数

// 是否是对象类型
export const isObject = (value) => typeof value == 'object' && value !== null

// 合并对象
export const extend = Object.assign