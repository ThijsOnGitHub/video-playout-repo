import type { FC } from "react";
import { SidebarItem } from "./sidebarItem";
import type { VideoItem } from "@/lib/types/VideoItem";

export enum SidebarItemTypes {
  PROGRAM = "program",
  BUTTON = "button",
}

export type SidebarItemProgram = {
  type: SidebarItemTypes.PROGRAM;
  value: VideoItem;
  onSelected: () => void;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
};

export type SidebarItemButton = {
  type: SidebarItemTypes.BUTTON;
  text: string;
  isAdd?: boolean;
  isSelected?: boolean;
  onClick: () => void;
};

export type SidebarItemType = SidebarItemProgram | SidebarItemButton;

export type SidebarItems = { [category: string]: SidebarItemType[] };

export interface SidebarProps {
  items: SidebarItems;
}

export const Sidebar: FC<SidebarProps> = ({ items }) => {
  return (
    <aside className="w-[280px] min-w-[280px] h-[calc(100dvh-50px)] bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <nav className="flex flex-col gap-6">
        {Object.entries(items).map(([category, categoryItems]) => (
          <section key={category} className="flex flex-col gap-1.5">
            <h2 className="px-2 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{category}</h2>
            {categoryItems.map((item, index) => {
              if (item.type === SidebarItemTypes.BUTTON) {
                return (
                  <SidebarItem key={`button-${index}`} isAdd={item.isAdd} isSelected={item.isSelected} onClick={item.onClick}>
                    {item.text}
                  </SidebarItem>
                );
              }
              if (item.type === SidebarItemTypes.PROGRAM) {
                return (
                  <SidebarItem key={item.value.id} onDelete={item.onDelete} showDelete={item.onDelete != null} onClick={item.onClick} isSelected={item.isSelected}>
                    {item.value.programName}
                  </SidebarItem>
                );
              }
              return null;
            })}
          </section>
        ))}
      </nav>
    </aside>
  );
};
