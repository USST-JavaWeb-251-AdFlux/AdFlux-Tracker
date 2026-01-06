// Simple Hyperscript Replacement

type Child = Node | string | number | boolean | null | undefined;
type Props<T extends HTMLElement> = Partial<Omit<T, 'style'>> & {
    style?: Partial<CSSStyleDeclaration>;
    [key: `on${string}`]: ((e: Event) => void) | undefined;
} & Record<string, unknown>;

type ExtractTagName<S extends string> = S extends `${infer T}${'#' | '.'}${string}`
    ? ExtractTagName<T>
    : S;

type GetElement<S extends string> =
    ExtractTagName<S> extends keyof HTMLElementTagNameMap
        ? HTMLElementTagNameMap[ExtractTagName<S>]
        : HTMLElement;

export function h<K extends string>(
    tag: K,
    propsOrChild?: Props<GetElement<K>> | Child,
    ...children: Child[]
): GetElement<K> {
    const el = document.createElement(tag.split(/[#.]/)[0]) as GetElement<K>;
    const id = tag.match(/#([a-zA-Z0-9-]+)/)?.[1];
    if (id) el.id = id;
    const classes = tag.match(/\.([a-zA-Z0-9-]+)/g);
    if (classes) classes.forEach((c) => el.classList.add(c.slice(1)));

    let actualProps: Props<HTMLElement> = {};
    const actualChildren: Child[] = children;

    const isChild = (obj: unknown): obj is Child =>
        typeof obj !== 'object' || obj instanceof Node || Array.isArray(obj);
    if (propsOrChild !== undefined && propsOrChild !== null) {
        if (isChild(propsOrChild)) {
            actualChildren.unshift(propsOrChild);
        } else {
            actualProps = propsOrChild as Props<HTMLElement>;
        }
    }

    for (const [key, value] of Object.entries(actualProps)) {
        if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value as (e: Event) => void);
        } else if (key === 'style' && typeof value === 'object' && value !== null) {
            Object.assign(el.style, value);
        } else {
            Reflect.set(el, key, value);
        }
    }

    for (const child of actualChildren) {
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            el.appendChild(child);
        }
    }

    return el;
}
