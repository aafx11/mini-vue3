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

class RefImpl {
  public _value;
  public readonly __v_isRef = true // 表示是这个 ref 属性
  // constructor 构造器的参数前添加public 修饰符，会将该参数添加到类的实例上
  constructor(public rawValue, public shallow) {

  }
}
function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow)
}