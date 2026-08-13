/**
 * Element Plus 3.x 把 locale 子模块拆成了 `.mjs`，
 * 官方包声明文件未覆盖本地子路径，需要手动声明。
 */
declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const locale: Record<string, unknown>
  export default locale
}