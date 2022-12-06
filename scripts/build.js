// 把packages 目录下的所有包(模块)进行打包

const fs = require('fs')
const execa = require('execa') // 开启一个子进程，使用rollup进行打包

// 读取packages文件夹,并过滤出文件夹(去掉文件,如README.MD)
const targets = fs.readdirSync('packages').filter(f => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false
  }
  return true
})

console.log(targets);

// 打包方式（打包过程是异步）
async function build (target) {
  // rollup -c --environment TARGET:target 执行命令，并且附带参数
  await execa(
    'rollup',
    ['-c', '--environment', `TARGET:${target}`],
    { stdio: 'inherit' } // 当子进程打包时的信息共享给父进程
  )
}
// 并行打包（目标，迭代方式） 
function runParallel (targets, iteratorFn) {
  const res = []
  for (const item of targets) {
    const p = iteratorFn(item)
    res.push(p)
  }
  return Promise.all(res)
}

// 对packages里的每个模块进行打包（并行打包）
runParallel(targets, build)
