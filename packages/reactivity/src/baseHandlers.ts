import { extend, isObject } from '@vue/shared';
import { track } from './effect';
import { TrackOpTypes } from './operators';
import { reactive, readonly } from './reactive';
/**
 * baseHandlers.js
 * new Proxy(target,handler) 中 handler的具体实现
 * 是否是深度代理，还是只代理对象的第一层属性
 * 是否是只读的，只读对象，调用set时应该报异常
 */

/**
 * Reflect介绍
 * Reflect后，后续Object上的方法，会被迁移到Reflect中(原本使用Object.getProptypeof() ，后续使用Reflect.getProptypeof())
 * target[key] = value 的方式设置值可能会失败(比如该属性被设置为只读)，赋值失败也不会报异常，并且没有返回值标识
 * Reflect 方法具备返回值，能通知使用者，方法是否调用成功
 */

/**
 * 拦截获取功能的具体实现
 * @param isReadonly 是否只读
 * @param isShallow 是否浅代理，只代理对象的第一层属性
 */
function createGetter(isReadonly = false, isShallow = false) {
  // 获取原始对象的某个属性值，receiver 代理后的对象,如 let proxy = reactive({obj:{}}) , 代理后的对象就是proxy
  return function get(target, key, receiver) {
    // proxy + reflect的应用
    const res = Reflect.get(target, key, receiver) // 相当于 target[key]

    // 不是只读，收集依赖，数据变化后更新对应的试图
    if (!isReadonly) {
      // effect 函数(参考effect.ts文件)执行时,会进行取值，触发get方法，就能收集依赖（收集effect），使响应式数据和effect函数产生关联
      console.log('执行effect,收集effect:', key);
      // TrackOpTypes.GET 当对这个对象（target）的属性(key)进行get操作时，进行依赖收集
      track(target, TrackOpTypes.GET, key)
    }

    // 是浅代理并且只读,返回get的结果(target[key])
    if (isShallow) {
      return res
    }

    /**
     * 只读，深度代理
     * 深度代理,当获取到的res是一个对象，再将原始对象转换成proxy对象，将res对象再包一层响应式(readonly() 或 reactive() )
     * Vue2是完整遍历整个对象的所有属性进行代理，Vue3 的代理模式是懒代理,用到哪层属性，再将这层的属性进行代理
     */
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}
/**
 * 拦截设置功能的具体实现
 * @param isShallow 是否浅代理，只代理对象的第一层属性
 */
function createSetter(isShallow = false) {
  return function set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver) // 相当于target[key] = value

    return result
  }
}
const get = createGetter()
const shallowGet = createGetter(false, true)
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const set = createSetter()
const shallowSet = createSetter(true)



export const mutableHandlers = {
  get,
  set
}

export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet
}

// 只读异常提示
let readonlyObj = {
  set: (target, key) => {
    console.warn(`set on key ${key} failed`)
  }
}

export const readonlyHandlers = extend({
  get: readonlyGet,
}, readonlyObj)

export const shallowReadonlyHandlers = extend({
  get: shallowReadonlyGet,

}, readonlyObj) 
