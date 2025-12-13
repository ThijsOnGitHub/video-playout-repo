import type { FC } from 'react'
import { SidebarItem } from './sidebarItem'
import type { ProgramFormSchema } from '@/lib/schemas/program'

export enum SidebarItemTypes {
  PROGRAM = 'program',
  BUTTON = 'button',
}

export type SidebarItemProgram = {
  type: SidebarItemTypes.PROGRAM
  value: ProgramFormSchema
  onSelected: () => void
  isSelected: boolean
  onClick: () => void
  onDelete?: () => void
}

export type SidebarItemButton = {
  type: SidebarItemTypes.BUTTON
  text: string
  isAdd?: boolean
  isSelected?: boolean
  onClick: () => void
}

export type SidebarItemType = SidebarItemProgram | SidebarItemButton

export type SidebarItems = { [category: string]: SidebarItemType[] }

export interface SidebarProps {
  items: SidebarItems
}

export const Sidebar: FC<SidebarProps> = ({ items }) => {
  return (
    <div className="sidebar__container">
      {Object.entries(items).map(([category, categoryItems]) => {
        return (
          <div key={category}>
            <div className="sidebar__header">{category}</div>
            {categoryItems.map((item, index) => {
              if (item.type === SidebarItemTypes.BUTTON) {
                return (
                  <SidebarItem
                    key={`button-${index}`}
                    isAdd={item.isAdd}
                    isSelected={item.isSelected}
                    onClick={item.onClick}
                  >
                    {item.text}
                  </SidebarItem>
                )
              }
              if (item.type === SidebarItemTypes.PROGRAM) {
                return (
                  <SidebarItem
                    key={item.value.id}
                    onDelete={item.onDelete}
                    showDelete={item.onDelete != null}
                    onClick={item.onClick}
                    isSelected={item.isSelected}
                  >
                    {item.value.programName}
                  </SidebarItem>
                )
              }
              return null
            })}
          </div>
        )
      })}
    </div>
  )
}
