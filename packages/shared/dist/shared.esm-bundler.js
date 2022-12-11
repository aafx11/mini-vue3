/* 公共函数 */
/* 判断数据类型 */
const isObject = (value) => typeof value == 'object' && value !== null; // 是否是对象类型
const isArray = Array.isArray;
const isFunction = (value) => typeof value == 'function';
const isNumber = (value) => typeof value == 'number';
const isString = (value) => typeof value == 'string';
const isIntegerKey = (key) => parseInt(key) + '' === key; // 判断是否是数组索引
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key); // 判断对象是否有该属性
const hasChanged = (oldValue, value) => oldValue !== value; // 判断旧值和新修改的值，是否相等
const extend = Object.assign; // 合并对象

export { extend, hasChanged, hasOwn, isArray, isFunction, isIntegerKey, isNumber, isObject, isString };
//# sourceMappingURL=shared.esm-bundler.js.map
