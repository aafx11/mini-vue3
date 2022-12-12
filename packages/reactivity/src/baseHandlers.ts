import { extend, isObject, isArray, isIntegerKey, hasOwn, hasChanged } from '@vue/shared';
import { track, trigger } from './effect';
import { TrackOpTypes, TriggerOpTypes } from './operators';
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
 * createGetter 拦截获取功能的具体实现
 * @param isReadonly 是否只读
 * @param shallow 是否浅代理，只代理对象的第一层属性
 */
function createGetter(isReadonly = false, shallow = false) {
  // 获取原始对象的某个属性值，receiver 代理后的对象,如 let proxy = reactive({obj:{}}) , 代理后的对象就是proxy
  return function get(target, key, receiver) {
    // proxy + reflect的应用
    const res = Reflect.get(target, key, receiver) // 相当于 target[key]

    // 不是只读，收集依赖，数据变化后更新对应的试图
    if (!isReadonly) {
      // effect 函数(参考effect.ts文件)执行时,会进行取值，触发get方法，就能收集依赖（收集effect），使响应式数据和effect函数产生关联
      // TrackOpTypes.GET 当对这个对象（target）的属性(key)进行get操作时，进行依赖收集(如template中v-model双向绑定，在初始化取值，就会触发get)
      track(target, TrackOpTypes.GET, key)
    }

    // 是浅代理并且只读,返回get的结果(target[key])
    if (shallow) {
      return res
    }

    /**
     * 深度代理
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
 * createSetter 拦截设置功能的具体实现
 * 当数据更新触发 set 时，通知对应属性的对应 effect 重新执行
 * 需要区分是新增（对象中新增属性，数组中新增元素）还是修改（修改对象中原有的属性，修改数组中原有的元素）
 * 修改还会出现，新修改的值和旧的值相等的情况
 * vue2 里无法监控更改索引，无法监控数组长度
 * @param shallow 是否浅代理，只代理对象的第一层属性
 */
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    const oldValue = target[key] // 获取修改前的值

    // hadKey 用于判断是新增还是修改操作
    let hadKey = isArray(target) && isIntegerKey(key) ? // 判断是否是数组，key 是否是整数索引
      Number(key) < target.length : // 如果key比数组长度小，则是修改，否则是新增
      hasOwn(target, key) // 不是数组，判断该对象(target)中是否含有这个属性(key)，判断是新增还是修改

    const result = Reflect.set(target, key, value, receiver) // 相当于target[key] = value

    if (!hadKey) { // 新增操作
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(oldValue, value)) { // 修改操作，但是新修改的值和旧值不相等
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
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
