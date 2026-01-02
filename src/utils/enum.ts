type EnumDefinition = Record<string, EnumItem>;

type Enum<T extends EnumDefinition> = Readonly<T> & {
    (): Readonly<T>;
    (value: ValueOf<T>): Readonly<T[keyof T]>;
};

type EnumItem = {
    value: number | string;
    label: string;
    type?: 'primary' | 'success' | 'info' | 'warning' | 'danger';
    [key: string]: unknown;
};

export type ValueOf<T> = {
    [K in keyof T]: T[K] extends { value: infer V } ? V : never;
}[keyof T];

export const createEnum = <T extends EnumDefinition>(definition: T): Enum<T> => {
    const valueMap = new Map<ValueOf<T>, T[keyof T]>();
    const enumFn = (value?: ValueOf<T>) => (value !== undefined ? valueMap.get(value) : definition);

    for (const [key, item] of Object.entries(definition)) {
        Object.defineProperty(enumFn, key, {
            value: item,
            writable: false,
            enumerable: true,
            configurable: false,
        });
        valueMap.set(item.value as ValueOf<T>, item as T[keyof T]);
        Object.freeze(item);
    }

    Object.freeze(enumFn);
    return enumFn as Enum<T>;
};
