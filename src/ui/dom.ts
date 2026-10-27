/** Petit utilitaire de création d'éléments DOM. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { className?: string; text?: string; aria?: string; testId?: string } = {},
  children: HTMLElement[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs.className) node.className = attrs.className;
  if (attrs.text) node.textContent = attrs.text;
  if (attrs.aria) node.setAttribute('aria-label', attrs.aria);
  if (attrs.testId) node.dataset.testid = attrs.testId;
  for (const c of children) node.appendChild(c);
  return node;
}
