import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslintPlugin from '@typescript-eslint/eslint-plugin'
import tseslintParser from '@typescript-eslint/parser'

// @typescript-eslint v7 的 recommended 是 legacy 格式（含 plugins/parserOptions 键），
// flat config 中只需取其 rules，插件注册和 parser 在下方手动接线。
const tsRecommendedRules = tseslintPlugin.configs.recommended.rules

export default [
  // 1. 全局忽略：构建产物、依赖、移动端壳、后端 Java
  { ignores: ['dist/**', 'node_modules/**', 'android/**', 'backend/**', 'coverage/**'] },

  // 2. 基线：所有 JS/TS 源文件（注册 TS 插件，规则取自 v7 legacy recommended）
  js.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tseslintPlugin
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      ...tsRecommendedRules,
      // 存量代码大量 any（182 处）：先降为警告保 CI，后续渐进收紧
      '@typescript-eslint/no-explicit-any': 'warn',
      // `_` 前缀 = 故意不用的参数（渠道适配器接口占位）；ignoreRestSiblings 覆盖解构排除写法
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
    }
  },

  // 2a. 所有 TS 文件改用 @typescript-eslint/parser（espree 不认 TS 语法）
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tseslintParser
    }
  },

  // 3. Vue SFC：vue-eslint-parser 解析模板，<script> 交给 @typescript-eslint/parser
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      // 模板规则降为警告：SFC 模板由 vue-tsc + 构建兜底，先保 CI 可过
      'vue/multi-word-component-names': 'warn',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off'
    }
  },

  // 4. .d.ts 声明文件与自动生成文件放宽
  {
    files: ['**/*.d.ts', 'src/types/**'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // Vue SFC 垫片 DefineComponent<{}, {}, any> 是官方样板写法
      '@typescript-eslint/ban-types': 'off'
    }
  },

  // 5. 构建脚本（vite.config.ts 等节点环境）：__dirname 等 node 全局合法
  {
    files: ['vite.config.ts', '**/*.config.{js,ts,cjs,mjs}'],
    rules: {
      'no-undef': 'off'
    }
  },

  // 6. CommonJS 脚本（test-api.cjs 等）：require 是正常写法
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      // Buffer/process/__dirname 等 node 全局：脚本文件不逐个声明
      'no-undef': 'off'
    }
  }
]
