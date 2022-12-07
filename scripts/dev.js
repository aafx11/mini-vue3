// 只针对某个包(模块)进行打包
const fs = require('fs')
const execa = require('execa') // 开启一个子进程，使用rollup进行打包

// 读取packages文件夹,并过滤出文件夹(去掉文件,如README.MD)
const targets = fs.readdirSync('packages').filter(f => {
  if (!fs.statSync(`packages/${f}`).isDirectory()) {
    return false
  }
  return true
})

const target = 'reactivity'
build()

// 打包方式（打包过程是异步）
async function build (target) {
  // rollup -cw --environment TARGET:target 执行命令，并且附带参数
  // -cw 监听模块，每次修改都会重新打包
  await execa(
    'rollup',
    ['-cw', '--environment', `TARGET:${target}`],
    { stdio: 'inherit' } // 当子进程打包时的信息共享给父进程
  )
}

