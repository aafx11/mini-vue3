import { hasChanged, isObject, isArray } from '@vue/shared';
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operators";
import { reactive } from './reactive';
/**
 * ref 和 reactive 的区别 ，reactive 底层采用proxy，ref 底层采用 defineProperty
 * 为什么有reactive 还需要 ref 呢？因为 reactive 只能处理对象，处理不了原始数据类型，new Proxy(target,handler) target只能是对象(object)类型
 */

/**
 * ref 将普通数据类型包装成响应式对象，该对象里的value属性，就是它的值
 * @param value value是原始数据类型也可以是对象，或者数组,但如果value是对象，用reactive更合理，因为 defineProperty 是针对对象的某一个属性的
 */
export function ref(value) {
  return createRef(value)
}

export function shallowRef(value) {
  return createRef(value, true)
}

const convert = (val) => isObject(val) ? reactive(val) : val
class RefImpl {
  public _value;
  public readonly __v_isRef = true // 表示是这个 ref 属性
  // constructor 构造器的参数前添加public 修饰符，会将该参数添加到类的实例上
  constructor(public rawValue, public shallow) {
    this._value = this.shallow ?
      rawValue : // 浅代理，直接赋值原始值
      convert(rawValue) // 深代理，如果是对象，包装一层reactive
  }
  // 类的属性访问器
  get value() { // 取值取的是.value，会代理到_value 上
    track(this, TrackOpTypes.GET, 'value') // this 为这个类的实例本身，是一个对象
    return this._value
  }
  set value(newValue) {
    if (hasChanged(newValue, this.rawValue)) { // 判断新set的值和原始值是否有变化
      this.rawValue = newValue // 如果有变化，新值替换原始值（rawValue始终是原始值的拷贝）
      this._value = this.shallow ? newValue : convert(newValue)
    }
    trigger(this, TriggerOpTypes.SET, 'value', newValue)
  }
}
function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow)
}

class ObjectRefImpl {
  public _value;
  public readonly __v_isRef = true

  constructor(public target, public key) {

  }
  get value() {
    return this.target[this.key] // toRef 后的取值，其实是从原来的响应式对象中取值，只是做了一层代理
  }
  set value(newValue) {
    this.target[this.key] = newValue
  }
}

/**
 * 将响应式对象的属性转换成 ref （用于结构响应式对象）
 * @param target 响应式对象
 * @param key 属性
 * @returns ObjectRefImpl 实例
 */
export function toRef(target, key) {
  return new ObjectRefImpl(target, key)
}

// 循环调用 ref , object可能为对象或数组
export function toRefs(object) {
  const ret = isArray(object) ? new Array(object.length) : {}
  for (let key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}

/**
 * 为什么需要toRef ？
 * let proxy = reactive({ name: 'test', title: '标题' })
 * // let { name } = proxy // 结构会破坏响应式，取出来的name 就是 'test' 字符串，
 * app.innerHTML = name 无法触发 get 收集依赖(track)
 * name = 'test02' 无法触发 set 触发更新(trigger)
 * 
 * 当用toRef时， let nameRef = toRef(proxy, 'name')
 * app.innerHTML = name ，实际上是 this.target[this.key] ，target 就是一个响应式对象，相当于 proxy.name ，触发get，收集到依赖(track)
 * name = 'test02' 实际上是 this.target[this.key] = newValue ,相当于 proxy.name 'test02'，触发set，触发更新(trigger)
 */