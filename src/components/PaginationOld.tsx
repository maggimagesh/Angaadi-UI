import type { ReactNode } from 'react'

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Right-aligned range and per-page note, e.g. "Showing 1–12 of 148 · 12 per page". */
  meta?: ReactNode
}

/**
 * Softened-cell pagination. The current page is an accent fill with pearl-white
 * numerals; every other page is a 1px-bordered cell. The props and the page
 * windowing are unchanged — only the chrome is new.
 */
export function PaginationOld({ currentPage, totalPages, onPageChange, meta }: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pages = getPageNumbers()

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: '7px 12px' }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>

      {pages.map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={index}
            type="button"
            className={`page-cell${currentPage === page ? ' is-current' : ''}`}
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="page-ellipsis">
            …
          </span>
        )
      )}

      <button
        type="button"
        className="btn btn-secondary"
        style={{ padding: '7px 12px' }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next
      </button>

      {meta ? <span className="page-meta">{meta}</span> : null}
    </nav>
  )
}
