// rollup 配置文件
import path from "path";
import json from '@rollup/plugin-json';
import pluginResolve from '@rollup/plugin-node-resolve';
import ts from 'rollup-plugin-typescript2';

// 根据环境变量中的target属性，获取对应模块的打包信息(package.json)

// 获取当前目录下的packages文件夹
const packagesDir = path.resolve(__dirname, 'packages')

// 找到packages下的特定(TARGET)模块,用于打包的基准目录
const packageDir = path.resolve(packagesDir, process.env.TARGET)

// 获取特定模块下的某个文件
const resolve = (p) => path.resolve(packageDir, p)

const pkg = require(resolve('package.json')) // 引入package.json
const name = path.basename(packageDir) // 获取文件名

// 打包类型映射表，根据提供的formats，打包相应的格式
const outputConfig = {
  'esm-bundler': {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: 'es'
  },
  'cjs': {
    file: resolve(`dist/${name}.cjs.js`),
    format: 'cjs'
  },
  'global': { // 浏览器环境，<script type="module"></script> , 会导出一个全局变量
    file: resolve(`dist/${name}.global.js`),
    format: 'iife' // 立即执行函数
  }
}

const options = pkg.buildOptions // package.json中的自定义选项

function createConfig (format, output) {
  console.log('output', output);
  output.name = options.name
  output.sourcemap = true

  // 生成roullup打包配置
  return {
    input: resolve(`src/index.ts`), // 入口
    output, // 出口
    plugins: [ // 插件
      json(),
      ts({
        tsconfig: path.resolve(__dirname, 'tsconfig.json') // 使用的是哪个ts配置文件
      }),
      pluginResolve() // 解析第三方模块
    ]
  }
}

// 导出rollup打包配置 
export default options.formats.map(format => createConfig(format, outputConfig[format]))