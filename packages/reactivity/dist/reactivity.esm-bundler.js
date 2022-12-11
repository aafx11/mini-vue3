/* 公共函数 */
/* 判断数据类型 */
const isObject = (value) => typeof value == 'object' && value !== null; // 是否是对象类型
const isArray = Array.isArray;
const isIntegerKey = (key) => parseInt(key) + '' === key; // 判断是否是数组索引
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key); // 判断对象是否有该属性
const hasChanged = (oldValue, value) => oldValue !== value; // 判断旧值和新修改的值，是否相等
const extend = Object.assign; // 合并对象

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
let activeEffect; // 存储当前执行的effect函数，使track 函数中，可以获取到当前执行的 effect 函数
const effectStack = []; // 存储多个effect函数，并且最后一个effect 永远是当前执行的effect 函数
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        // 当 effect 函数 不在 effectStack 栈中，再执行入栈，防止同一个effect重复入栈，防止无限执行
        if (!effectStack.includes(effect)) {
            try {
                effectStack.push(effect); // 入栈
                activeEffect = effect;
                return fn(); // fn 函数会有返回值
            }
            finally { // fn 函数可能会报错，try-finally 能保证fn 函数执行完后，出栈
                effectStack.pop(); // fn 函数执行完后，出栈
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    effect.id = uid++; // 标识每个effect的唯一性
    effect._isEffect = true; // 标识这个是响应式effect ，并且是私有变量，外部无法获取
    effect.raw = fn; // 保存原函数
    effect.options = options; // 保存配置项
    return effect;
}
const targetMap = new WeakMap();
// track 函数,收集依赖，让某个对象(target)中的某个属性(key)，收集当前对应的effect函数
function track(target, type, key) {
    // 此属性(key)不需要收集依赖 , 因为没在 effect 中执行
    if (activeEffect === undefined) {
        return;
    }
    let depsMap = targetMap.get(target); // 获取到的是一个Map
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map));
    }
    let dep = depsMap.get(key); // key 对应的依赖收集
    if (!dep) {
        depsMap.set(key, (dep = new Set));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
    }
    console.log('targetMap', targetMap);
}
// 触发更新
function trigger(target, type, key, newValue, oldValue) {
    console.log(target, type, key, newValue, oldValue);
    // 判断这个属性有无收集过 effect ，如果无，则不需要触发更新
    const depsMap = targetMap.get(target); // 得到的是一个Map(当前这个对象属性的所有依赖，有选择性的触发更新) ， key 是属性 ，value 是对应的 effect
    if (!depsMap)
        return;
    // 将所有需要执行的 effect，全部存到一个新的集合中，最后一起执行 (effects 需要防止重复，为 Set 可以去重，在examples文件夹中的effect.html 中 ，数组元素的下标和数组长度对应同一个effect )
    const effects = new Set();
    const add = (effectsToAdd) => {
        if (effectsToAdd) {
            effectsToAdd.forEach(effect => effects.add(effect));
        }
    };
    if (key === 'length' && isArray(target)) { // 修改数组长度
        depsMap.forEach((dep, key) => {
            /**
             * 在target 为数组，key 为length的情况下，depsMap里的key 可能为数组下标或数组长度length
             * 在examples文件夹中的effect.html 中
             * reactiveTest.arr.length = 1 ，当前 newValue 就为1
             * 而 effect 函数中app.innerHTML = reactiveTest.arr[2] ，key 为2
             * 则 key(2) > newValue(1) ，需要触发更新(即数组长度的修改，覆盖到了数组原有的元素)
             */
            if (key === 'length' || key > newValue) {
                add(dep); // dep是属性对应的 effect
            }
        });
    }
    else { // 除去修改数组长度的特殊操作,剩余对象或数组的 ADD,SET 操作
        if (key !== void 0) { // key不等于 undefined，有key，为SET(修改)操作
            add(depsMap.get(key)); // 取出 effect 并放入 effects
        }
        switch (type) {
            case "add" /* TriggerOpTypes.ADD */:
                if (isArray(target) && isIntegerKey(key)) {
                    add(depsMap.get('length'));
                }
                break;
        }
    }
    effects.forEach((effect) => effect());
}
/**
 * 对象的属性和对应的多个 effect 之间的关系
 * target ：{ name: 'test', age: { num: 20 }
 * key ：name
 * 对应的effect（可能为多个）: [effect1 , effect2]
 * 如何去存储 对象--> 属性--> effect 的三层关系？
 * WeakMap(1) key为 对象， value 还是为一个 Map(2) ，Map(2) 的 key 为属性，value 为一个 Set（Set可以去重） 存储多个effect
 */
/**
 * 为什么需要 effectStack 栈来存储 effect 函数？
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
        console.log('get', key);
        // proxy + reflect的应用
        const res = Reflect.get(target, key, receiver); // 相当于 target[key]
        // 不是只读，收集依赖，数据变化后更新对应的试图
        if (!isReadonly) {
            // effect 函数(参考effect.ts文件)执行时,会进行取值，触发get方法，就能收集依赖（收集effect），使响应式数据和effect函数产生关联
            // TrackOpTypes.GET 当对这个对象（target）的属性(key)进行get操作时，进行依赖收集(如template中v-model双向绑定，在初始化取值，就会触发get)
            track(target, "get" /* TrackOpTypes.GET */, key);
        }
        // 是浅代理并且只读,返回get的结果(target[key])
        if (shallow) {
            return res;
        }
        /**
         * 深度代理
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
 * createSetter 拦截设置功能的具体实现
 * 当数据更新触发 set 时，通知对应属性的对应 effect 重新执行
 * 需要区分是新增（对象中新增属性，数组中新增元素）还是修改（修改对象中原有的属性，修改数组中原有的元素）
 * 修改还会出现，新修改的值和旧的值相等的情况
 * vue2 里无法监控更改索引，无法监控数组长度
 * @param shallow 是否浅代理，只代理对象的第一层属性
 */
function createSetter(shallow = false) {
    return function set(target, key, value, receiver) {
        const oldValue = target[key]; // 获取修改前的值
        // hadKey 用于判断是新增还是修改操作
        let hadKey = isArray(target) && isIntegerKey(key) ? // 判断是否是数组，key 是否是整数索引
            Number(key) < target.length : // 如果key比数组长度小，则是修改，否则是新增
            hasOwn(target, key); // 不是数组，判断该对象(target)中是否含有这个属性(key)，判断是新增还是修改
        const result = Reflect.set(target, key, value, receiver); // 相当于target[key] = value
        if (!hadKey) { // 新增操作
            trigger(target, "add" /* TriggerOpTypes.ADD */, key, value);
        }
        else if (hasChanged(oldValue, value)) { // 修改操作，但是新修改的值和旧值不相等
            trigger(target, "set" /* TriggerOpTypes.SET */, key, value, oldValue);
        }
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

export { effect, reactive, readonly, shallowReactive, shallowReadonly };
//# sourceMappingURL=reactivity.esm-bundler.js.map
