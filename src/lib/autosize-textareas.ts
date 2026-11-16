/**
 * Text boxes grow with what is typed instead of scrolling inside
 * themselves. Most browsers do this from CSS alone (`field-sizing: content`
 * in index.css); this covers the rest, for every textarea on the site at
 * once, including ones that appear later. A box opts out with
 * data-autosize="off".
 */
export function autosizeTextareas() {
  if (typeof window === 'undefined' || CSS.supports?.('field-sizing', 'content')) return

  const fit = (box: HTMLTextAreaElement) => {
    if (box.dataset.autosize === 'off') return
    box.style.height = 'auto'
    const border = box.offsetHeight - box.clientHeight
    box.style.height = `${box.scrollHeight + border}px`
  }
  const fitAll = (root: ParentNode) => root.querySelectorAll('textarea').forEach(fit)

  // Typing.
  document.addEventListener('input', (event) => {
    if (event.target instanceof HTMLTextAreaElement) fit(event.target)
  })
  // Boxes that appear, and text filled in by the page (a saved draft).
  new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.target instanceof HTMLTextAreaElement) fit(change.target)
      change.addedNodes.forEach((node) => {
        if (node instanceof HTMLTextAreaElement) fit(node)
        else if (node instanceof HTMLElement) fitAll(node)
      })
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true })
  window.addEventListener('resize', () => fitAll(document))
  fitAll(document)
}
