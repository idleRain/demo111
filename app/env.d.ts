/// <reference types="nitro" />
/// <reference types="vue" />

declare module '#app' {
  interface PageMeta {
    layout?: string
    middleware?: string | string[]
  }
}

export {}
