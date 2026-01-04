import React, { useEffect } from 'react'

type ModalProps = {
  title: string
  open: boolean
  onClose: () => void
  children?: React.ReactNode
  makeOnCloseOptional?: boolean
}

export default function Modal({ title, open, onClose, children, makeOnCloseOptional =false}: ModalProps) {
  useEffect(() => {

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null


  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }

  const contentStyle: React.CSSProperties = {
    padding: 16,
    overflow: 'auto',
  }

  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
  }

  return (
    <div className='fixed inset-0 bg-[rgba(0,0,0,0.5)] items-center justify-center z-1000 flex' onMouseDown={onClose} role="presentation">
      <div
        className='border-4 bg-gray-900 border-white rounded-lg  w-[90%] max-w-[640px] max-h-[90vh] shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden'
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={headerStyle}>
          <h2 id="modal-title" style={{ margin: 0 }}>{title}</h2>{
            makeOnCloseOptional ? false :
          <button onClick={onClose} aria-label="Close" style={closeButtonStyle}>
            ×
          </button>}
        </div>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  )
}
