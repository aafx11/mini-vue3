import { isObject } from '@vue/shared';
import {
  mutableHandlers,
  shallowReactiveHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from './baseHandlers';

export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers)
}

export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers)

}

// readonly 不需要收集依赖，性能更高
export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers)

}

export function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers)

}

/**
 * 这几个方法的区别在于，是否只读，以及响应式深度不同，使用 createReactiveObject 公共函数
 * 柯里化，传不同参数，实现不同效果，
 * new Proxy() 核心是拦截数据的读取和数据的修改(劫持代理get 和 set 方法)
 */

/**
 * WeakMap 会自动垃圾回收，不会造成内存泄露，存储的key只能是对象
 * Map 的key 如果是对象，当这个对象被清空，可能会出现 Map 还在引用这个对象的情况，造成内存泄漏
 */
const reactiveMap = new WeakMap() // 响应式数据代理空间，存储已经被代理的对象
const readonlyMap = new WeakMap() // 只读数据代理空间，存储已经被代理的对象

/**
 * 劫持代理目标对象(target)，并将代理后的proxy对象放入代理空间
 * @param target 目标对象
 * @param isReadonly 是否只读
 * @param baseHandler new Proxy(target,handler) 中 handler的具体实现
 * @returns 
 */
export function createReactiveObject(target, isReadonly, baseHandler) {
  // proxy 只能拦截对象，reactive 只能拦截对象类型，如果不是对象，直接return target
  if (!isObject(target)) {
    return target
  }

  // 当一个对象被代理过了，就不需要重复代理，并且一个对象可能被reactive（响应式）代理，又被readonly（只读）代理，需要区分
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  const exisitProxy = proxyMap.get(target)

  // 如果目标对象（target）已经被代理过了，直接返回
  if (exisitProxy) {
    return exisitProxy
  }
  const proxy = new Proxy(target, baseHandler)
  proxyMap.set(target, proxy) // 将被代理的对象（target）和代理后的结果存储在 WeakMap 中
  return proxy
}