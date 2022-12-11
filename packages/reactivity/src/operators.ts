/**
 * 调试事件操作类型
 * 使用字符串代替数字，是为了更方便检查
 */

// 依赖收集操作符
export const enum TrackOpTypes {
  GET = 'get' // get()操作
}

// set 时的操作类型，是新增（对象中新增属性，数组中新增元素）还是修改（修改对象中原有的属性，修改数组中原有的元素）
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
}