/* Not type checking this file because flow doesn't play well with Object.defineProperty */

import Watcher from '../observer/watcher'
import Dep from '../observer/dep'
import {
  observe,
  defineReactive,
  observerState,
  proxy,
  unproxy
} from '../observer/index'
import {
  warn,
  hasOwn,
  isPlainObject,
  bind,
  validateProp,
  noop
} from '../util/index'

export function initState (vm) {
  vm._watchers = []
  initProps(vm)
  initData(vm)
  initComputed(vm)
  initMethods(vm)
  initWatch(vm)
}

function initProps (vm) {
  const props = vm.$options.props
  const propsData = vm.$options.propsData
  if (props) {
    const keys = vm.$options.propKeys = Object.keys(props)
    const isRoot = !vm.$parent
    // root instance props should be converted
    observerState.shouldConvert = isRoot
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      defineReactive(vm, key, validateProp(vm, key, propsData))
    }
    observerState.shouldConvert = true
  }
}

function initData (vm) {
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? data()
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object.',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  let i = keys.length
  while (i--) {
    proxy(vm, keys[i])
  }
  // observe data
  observe(data, vm)
}

function initComputed (vm) {
  const computed = vm.$options.computed
  if (computed) {
    for (const key in computed) {
      const userDef = computed[key]
      const def = {
        enumerable: true,
        configurable: true
      }
      if (typeof userDef === 'function') {
        def.get = makeComputedGetter(userDef, vm)
        def.set = noop
      } else {
        def.get = userDef.get
          ? userDef.cache !== false
            ? makeComputedGetter(userDef.get, vm)
            : bind(userDef.get, vm)
          : noop
        def.set = userDef.set
          ? bind(userDef.set, vm)
          : noop
      }
      Object.defineProperty(vm, key, def)
    }
  }
}

function makeComputedGetter (getter, owner) {
  const watcher = new Watcher(owner, getter, null, {
    lazy: true
  })
  return function computedGetter () {
    if (watcher.dirty) {
      watcher.evaluate()
    }
    if (Dep.target) {
      watcher.depend()
    }
    return watcher.value
  }
}

function initMethods (vm) {
  const methods = vm.$options.methods
  if (methods) {
    for (const key in methods) {
      vm[key] = bind(methods[key], vm)
    }
  }
}

function initWatch (vm) {
  const watch = vm.$options.watch
  if (watch) {
    for (const key in watch) {
      const handler = watch[key]
      if (Array.isArray(handler)) {
        for (let i = 0; i < handler.length; i++) {
          createWatcher(vm, key, handler[i])
        }
      } else {
        createWatcher(vm, key, handler)
      }
    }
  }
}

function createWatcher (vm, key, handler) {
  let options
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  vm.$watch(key, handler, options)
}

export function stateMixin (Vue) {
  Object.defineProperty(Vue.prototype, '$data', {
    get () {
      return this._data
    },
    set (newData) {
      if (newData !== this._data) {
        setData(this, newData)
      }
    }
  })

  Vue.prototype.$watch = function (expOrFn, cb, options) {
    options = options || {}
    options.user = true
    const watcher = new Watcher(this, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(this, watcher.value)
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

function setData (vm, newData) {
  newData = newData || {}
  const oldData = vm._data
  vm._data = newData
  let keys, key, i
  // unproxy keys not present in new data
  keys = Object.keys(oldData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!(key in newData)) {
      unproxy(vm, key)
    }
  }
  // proxy keys not already proxied,
  // and trigger change for changed values
  keys = Object.keys(newData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!hasOwn(vm, key)) {
      // new property
      proxy(vm, key)
    }
  }
  oldData.__ob__.removeVm(vm)
  observe(newData, vm)
  vm.$forceUpdate()
}
