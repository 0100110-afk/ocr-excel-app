import React from 'react'

// Toàn bộ icon là SVG nét đơn (stroke), tự đổi theo màu chữ (currentColor)
const make = (children) =>
  function Icon({ size = 18, strokeWidth = 1.8, ...rest }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {children}
      </svg>
    )
  }

export const IconTable = make(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 4v16" />
  </>
)
export const IconKey = make(
  <>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9" />
    <path d="M16 7l3 3" />
  </>
)
export const IconUpload = make(
  <>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </>
)
export const IconDownload = make(
  <>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </>
)
export const IconImage = make(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 16l-5-5-8 8" />
  </>
)
export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
)
export const IconCheck = make(<path d="M5 12l5 5 9-10" />)
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />)
export const IconAlert = make(
  <>
    <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
)
export const IconEye = make(
  <>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
)
export const IconEyeOff = make(
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.7C3.9 8.5 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>
)
export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M9 7V4h6v3" />
  </>
)
export const IconText = make(
  <>
    <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5" />
    <path d="M8 13h8M8 17h6" />
  </>
)
export const IconFilter = make(<path d="M3 5h18l-7 8v6l-4-2v-4z" />)
export const IconPlay = make(<path d="M7 4l13 8-13 8z" />)
export const IconStop = make(<rect x="6" y="6" width="12" height="12" rx="1.5" />)
