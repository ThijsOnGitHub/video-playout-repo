import type { FC, ReactNode } from 'react'

export interface TopBarProps {
  children?: ReactNode
}

export const TopBar: FC<TopBarProps> = ({ children }) => {
  return (
    <div className="top-bar__container flex justify-between">
      <div className="flex gap-5">
        <div className="top-bar__logo">TV</div>
        <div className="top-bar__text">Kabelkrant manager</div>
      </div>
      {children}
    </div>
  )
}
