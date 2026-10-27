import type { ReactNode } from 'react'

/* The opening of every inner page: a small kicker, a large title and a line of
   context, set straight on the room instead of inside a card. The title is the
   page's one <h1>. */

type Props = {
  kicker: string
  title: string
  lede?: ReactNode
  /** short facts shown as a row under the lede, e.g. "3 items", "Free delivery". */
  trail?: ReactNode[]
  actions?: ReactNode
  id?: string
}

export function PageHero({ kicker, title, lede, trail, actions, id }: Props) {
  return (
    <header className="ph" id={id}>
      <p className="ph-kicker">{kicker}</p>
      <h1 className="ph-title">{title}</h1>
      {lede ? <p className="ph-lede">{lede}</p> : null}
      {trail && trail.length > 0 ? (
        <ul className="ph-trail">
          {trail.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null}
      {actions ? <div className="ph-actions">{actions}</div> : null}
    </header>
  )
}
