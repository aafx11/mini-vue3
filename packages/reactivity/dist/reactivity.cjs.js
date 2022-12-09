'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// 公共函数
// 是否是对象类型
const isObject = (value) => typeof value == 'object' && value !== null;
// 合并对象
const extend = Object.assign;

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
        const res = Reflect.get(target, key, receiver); // 相当于 target[key]
        // 不是只读，收集依赖，数据变化后更新对应的试图
        if (!isReadonly) {
            // effect 函数(参考effect.ts文件)执行时,会进行取值，触发get方法，就能收集依赖（收集effect），使响应式数据和effect函数产生关联
            console.log('执行effect,收集effect:', key);
        }
        // 是浅代理并且只读,返回get的结果(target[key])
        if (isShallow) {
            return res;
        }
        /**
         * 只读，深度代理
         * 深度代理,当获取到的res是一个对象，再将原始对象转换成proxy对象，将res对象再包一层响应式(readonly() 或 reactive() )
         * Vue2是完整遍历整个对象的所有属性进行代理，Vue3 的代理模式是懒代理,用到哪层属性，再将这层的属性进行代理
         */
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
/**
 * 拦截设置功能的具体实现
 * @param isShallow 是否浅代理，只代理对象的第一层属性
 */
function createSetter(isShallow = false) {
    return function set(target, key, value, receiver) {
        const result = Reflect.set(target, key, value, receiver); // 相当于target[key] = value
        return result;
    };
}
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const shallowSet = createSetter(true);
const mutableHandlers = {
    get,
    set
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
};
// 只读异常提示
let readonlyObj = {
    set: (target, key) => {
        console.warn(`set on key ${key} failed`);
    }
};
const readonlyHandlers = extend({
    get: readonlyGet,
}, readonlyObj);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,
}, readonlyObj);

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
// readonly 不需要收集依赖，性能更高
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
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
const reactiveMap = new WeakMap(); // 响应式数据代理空间，存储已经被代理的对象
const readonlyMap = new WeakMap(); // 只读数据代理空间，存储已经被代理的对象
/**
 * 劫持代理目标对象(target)，并将代理后的proxy对象放入代理空间
 * @param target 目标对象
 * @param isReadonly 是否只读
 * @param baseHandler new Proxy(target,handler) 中 handler的具体实现
 * @returns
 */
function createReactiveObject(target, isReadonly, baseHandler) {
    // proxy 只能拦截对象，reactive 只能拦截对象类型，如果不是对象，直接return target
    if (!isObject(target)) {
        return target;
    }
    // 当一个对象被代理过了，就不需要重复代理，并且一个对象可能被reactive（响应式）代理，又被readonly（只读）代理，需要区分
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const exisitProxy = proxyMap.get(target);
    // 如果目标对象（target）已经被代理过了，直接返回
    if (exisitProxy) {
        return exisitProxy;
    }
    const proxy = new Proxy(target, baseHandler);
    proxyMap.set(target, proxy); // 将被代理的对象（target）和代理后的结果存储在 WeakMap 中
    return proxy;
}

/**
 * effect副作用函数，将这个effect变成响应式的effect，做到数据发生变化，就重新执行effect函数更新视图
 * @param fn
 * @param options
 */
function effect(fn, options = {}) {
    const effect = createReactiveEffect(fn, options);
    // 响应式的effect会默认执行一次，如果options配置了lazy 懒执行，则不执行effect()
    if (!options.lazy) {
        effect();
    }
    return effect;
}
let uid = 0;
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        fn();
    };
    effect.id = uid++; // 标识每个effect的唯一性
    effect._isEffect = true; // 标识这个是响应式effect ，并且是私有变量，外部无法获取
    effect.raw = fn; // 保存原函数
    effect.options = options; // 保存配置项
    return effect;
}

exports.effect = effect;
exports.reactive = reactive;
exports.readonly = readonly;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
//# sourceMappingURL=reactivity.cjs.js.map
