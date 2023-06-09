export const TAG_KEY = Symbol()

export type TaggedUnion<T extends Record<string, any>, D extends keyof any = typeof TAG_KEY> = {
  [K in keyof T]: Simplify<Record<D, K> & T[K]>
}[keyof T]

type Simplify<T> = T extends T ? { [K in keyof T]: T[K] } : never

type Payload<TaggedUnion extends { [TAG_KEY]: string }, K extends TaggedUnion[typeof TAG_KEY]> = Simplify<
  Omit<Simplify<TaggedUnion & { [TAG_KEY]: K }>, typeof TAG_KEY>
>

type Is<TaggedUnion extends Record<D, string>, D extends keyof any = typeof TAG_KEY> = Simplify<{
  [K in TaggedUnion[D]]: (taggedUnion: TaggedUnion) => taggedUnion is Simplify<TaggedUnion & Record<D, K>>
}>
function createIs<TaggedUnion extends Record<D, string>, D extends keyof any>(tagKey: D): Is<TaggedUnion, D> {
  return new Proxy(
    {},
    {
      get(target, key) {
        return (taggedUnion: TaggedUnion) => taggedUnion[tagKey] === key
      },
    },
  ) as any
}

export function operatorsOf<TaggedUnion extends { [TAG_KEY]: string }>(): Simplify<
  {
    match: <
      Matchers extends {
        [K in TaggedUnion[typeof TAG_KEY]]: (payload: Payload<TaggedUnion, K>) => unknown
      },
    >(
      taggedUnion: TaggedUnion,
      matchers: Matchers,
    ) => ReturnType<Matchers[keyof Matchers]>
    is: Is<TaggedUnion>
  } & {
    [K in TaggedUnion[typeof TAG_KEY]]: <const T extends Payload<TaggedUnion, K>>(
      payload: T,
    ) => Simplify<T & { [TAG_KEY]: K }>
  }
> {
  return new Proxy(
    {
      match: <
        Matchers extends {
          [K in TaggedUnion[typeof TAG_KEY]]: (payload: Payload<TaggedUnion, K>) => unknown
        },
      >(
        taggedUnion: TaggedUnion,
        matchers: Matchers,
      ): ReturnType<Matchers[keyof Matchers]> => {
        return (matchers as any)[taggedUnion[TAG_KEY]](taggedUnion)
      },
      is: createIs<TaggedUnion, typeof TAG_KEY>(TAG_KEY),
    },
    {
      get(target, key) {
        if (Reflect.has(target, key)) return Reflect.get(target, key)

        return (value: object) => ({ ...value, [TAG_KEY]: key })
      },
    },
  ) as any
}

export function defineTaggedUnion<const Payloads extends Record<string, any>>(): {
  withTagKey: <const D extends keyof any>(
    tagKey: D,
  ) => Simplify<
    {
      match: <Matchers extends { [K in keyof Payloads]: (payload: Payloads[K]) => unknown }>(
        taggedUnion: TaggedUnion<Payloads, D>,
        matchers: Matchers,
      ) => ReturnType<Matchers[keyof Matchers]>
      is: Is<TaggedUnion<Payloads, D>, D>
    } & {
      [K in keyof Payloads]: <const T extends Payloads[K]>(payload: T) => Simplify<T & Record<D, K>>
    }
  >
} {
  return {
    withTagKey: <const D extends keyof any>(tagKey: D) => {
      function match<
        Matchers extends {
          [K in keyof Payloads]: (payload: Payloads[K]) => unknown
        },
      >(taggedUnion: TaggedUnion<Payloads, D>, matchers: Matchers): ReturnType<Matchers[keyof Matchers]> {
        return (matchers as any)[taggedUnion[tagKey]](taggedUnion)
      }

      return new Proxy(
        {
          match,
          is: createIs<TaggedUnion<Payloads, D>, D>(tagKey),
        },
        {
          get(target, key) {
            if (Reflect.has(target, key)) return Reflect.get(target, key)

            return (value: object) => ({ ...value, [tagKey]: key })
          },
        },
      )
    },
  } as any
}

export type ExtractTaggedUnionType<T extends { match: (taggedUnion: any, matchers: any) => any }> = Parameters<
  T['match']
>[0]
