/**
 * The stylesheet the shadow-DOM fixtures inject into their shadow roots.
 *
 * A shadow root gets no styles from the page, so the result cards inside one
 * have to carry their own copy. All three fixtures (/shadow-dom,
 * /shadow-dom-full, /shadow-iframe) import this one string rather than each
 * keeping a near-identical block, so a card inside a shadow root cannot drift
 * from the same card in the light DOM.
 *
 * Custom properties DO cross the shadow boundary, so every colour here is a
 * design-system token and the fixtures follow a retune of the theme for free.
 */
export const SHADOW_CARD_CSS = `
  :host {
    display: block;
    font-family: var(--font-body, "Amazon Ember", "Inter", system-ui, sans-serif);
    color: var(--color-text);
  }
  .shadow-scroll-wrap { padding: 20px; scroll-behavior: smooth; }
  .is-product-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  .is-product-card {
    background: #fff;
    border: 1px solid transparent;
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    display: flex; flex-direction: column;
    transition: box-shadow 90ms linear, border-color 90ms linear;
  }
  .is-product-card:hover {
    border-color: var(--color-divider);
    box-shadow: var(--shadow-md);
  }

  .is-card-image { position: relative; height: 210px; background: #fff; overflow: hidden; }
  .is-card-image img {
    width: 100%; height: 100%; object-fit: contain; padding: 14px;
    transition: transform 160ms ease-out;
  }
  .is-product-card:hover .is-card-image img { transform: scale(1.04); }

  .is-card-badge {
    position: absolute; top: 10px; left: 10px;
    background: #cc0c39; color: #fff;
    padding: 2px 8px; border-radius: var(--radius-sm, 4px);
    font-size: 12px; font-weight: 700; letter-spacing: 0; text-transform: none;
  }
  .is-card-stock-badge {
    position: absolute; bottom: 10px; right: 10px;
    padding: 2px 8px; border-radius: var(--radius-sm, 4px);
    font-size: 12px; font-weight: 700;
    background: #fff; border: 1px solid var(--color-divider);
  }
  .is-card-stock-badge.in-stock { color: var(--color-success); }
  .is-card-stock-badge.out-of-stock { color: var(--color-price); }

  .is-card-body { padding: 12px 14px 16px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .is-card-brand {
    font-size: 12px; font-weight: 400; text-transform: none; letter-spacing: 0;
    color: var(--color-neutral-700); margin: 0;
  }
  .is-card-title {
    font-size: 15px; font-weight: 400; color: var(--color-text); margin: 0; line-height: 1.35;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .is-card-rating { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .is-card-rating .stars { color: var(--color-star); letter-spacing: 0; font-size: 14px; }
  .is-card-rating .count { color: var(--color-accent); font-size: 12px; }

  .is-card-pricing { display: flex; align-items: baseline; gap: 8px; margin-top: auto; padding-top: 6px; }
  .is-card-price { font-size: 20px; font-weight: 500; color: var(--color-text); }
  .is-card-old-price { font-size: 13px; color: var(--color-neutral-700); text-decoration: line-through; }
  .is-card-delivery { font-size: 12px; color: var(--color-neutral-700); font-weight: 400; }

  .is-sentinel { display: flex; justify-content: center; align-items: center; padding: 32px 0; gap: 12px; }
  .is-spinner {
    width: 26px; height: 26px;
    border: 3px solid var(--color-neutral-300);
    border-top-color: var(--color-orange-600);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .is-sentinel span { font-size: 13px; color: var(--color-neutral-700); font-weight: 400; }

  .shadow-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--color-tan); color: var(--color-navy);
    padding: 4px 12px; border-radius: var(--radius-sm, 4px);
    font-size: 13px; font-weight: 700; margin-bottom: 16px;
  }

  @media (max-width: 1200px) { .is-product-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 768px)  { .is-product-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
  @media (max-width: 480px)  { .is-product-grid { grid-template-columns: 1fr; } }
`

/**
 * /shadow-dom-full puts the entire page body inside one shadow root, so the
 * page chrome has to be injected there too.
 */
export const SHADOW_PAGE_CSS = `
  .shadow-dom-page {
    min-height: calc(100vh - var(--header-height, 64px));
    background: var(--color-bg);
    display: flex; flex-direction: column;
  }
  .shadow-dom-header {
    background: var(--color-navy-2);
    padding: 22px var(--page-gutter, 22px) 24px;
    position: relative; overflow: hidden;
  }
  .shadow-dom-header::after { content: none; }
  .shadow-dom-header h1 {
    color: #fff; font-size: 24px; font-weight: 700; margin: 0 0 4px;
    letter-spacing: -0.01em; position: relative; z-index: 1;
  }
  .shadow-dom-header p {
    color: #ccd2d8; font-size: 14px; margin: 0; position: relative; z-index: 1;
  }
  .shadow-dom-container {
    flex: 1;
    padding: 20px var(--page-gutter, 22px);
    max-width: 1500px; margin: 0 auto; width: 100%; box-sizing: border-box;
  }
`
