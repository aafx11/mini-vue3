/**
 * effect副作用函数，将这个effect变成响应式的effect，做到数据发生变化，就重新执行effect函数更新视图
 * @param fn 
 * @param options 
 */
export function effect(fn, options: any = {}) {
  const effect = createReactiveEffect(fn, options)

  // 响应式的effect会默认执行一次，如果options配置了lazy 懒执行，则不执行effect()
  if (!options.lazy) {
    effect()
  }

  return effect
}
let uid = 0
let activeEffect // 存储当前执行的effect函数，使track 函数中，可以获取到当前执行的 effect 函数
const effectStack = [] // 存储多个effect函数，并且最后一个effect 永远是当前执行的effect 函数
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    try {
      effectStack.push(effect) // 入栈
      activeEffect = effect
      return fn() // fn 函数会有返回值
    } finally { // fn 函数可能会报错，try-finally 能保证fn 函数执行完后，出栈
      effectStack.pop() // fn 函数执行完后，出栈
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
  effect.id = uid++ // 标识每个effect的唯一性
  effect._isEffect = true // 标识这个是响应式effect ，并且是私有变量，外部无法获取
  effect.raw = fn // 保存原函数
  effect.options = options // 保存配置项
  return effect
}

export function track(target, type, key) {
  activeEffect
}

/**
 * let activeEffect ,如果直接将当前执行的effect函数赋值给 activeEffect 来保存，无法处理嵌套effect 的情况
 * effect(()=>{ 第一个effect 是effect1
 *  
 *  obj.name ='name' 这个属性关联effect1 
 *  
 *  effect(()=>{  第二个effect 是effect2
 *    obj.age = '20'  这个属性关联effect2 ，这个时候 activeEffect就变成effect2 了
 *  }) 
 *    
 *  obj.num = 20 这个属性会关联effect2 , 这是不合理的，obj的num属性正确关联应该是 effect1
 *  
 *  所以需要是一个栈 effectStack , 存储多个effect ，effect 执行前，将effect入栈，
 *  当effect 执行完，就出栈，这样effectStack的最后一个effect，永远是当前执行的effect 
 * })
 * 
 */