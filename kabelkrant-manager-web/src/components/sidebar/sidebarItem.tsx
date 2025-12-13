import type { FC, ReactNode, HTMLAttributes, DetailedHTMLProps } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface SidebarItemProps {
  isAdd?: boolean
  isSelected?: boolean
  children?: ReactNode
  showDelete?: boolean
  onDelete?: () => void
}

export const SidebarItem: FC<
  SidebarItemProps &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
> = ({
  isSelected = false,
  children,
  isAdd = false,
  showDelete = false,
  onDelete,
  ...props
}) => {
  return (
    <div
      {...props}
      className={
        'sidebar-item__container ' +
        (isSelected ? ' sidebar-item__container--selected' : '')
      }
    >
      {isAdd && <Plus className="sidebar-item__add-icon h-4 w-4" />}
      {children}
      {showDelete && (
        <Trash2
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.()
          }}
          width={15}
          height={15}
        />
      )}
    </div>
  )
}
