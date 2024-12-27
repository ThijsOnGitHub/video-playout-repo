import { FC } from "react"
import { SidebarItem } from "./sidebarItem"
import { ProgrammaFormSchema } from "../../type/programFormName";

export enum SidebarItemTypes {
    PROGRAM = "program",
    BUTTON = "button",
}

export type SidebarItemProgram = {
    type: SidebarItemTypes.PROGRAM
    value: ProgrammaFormSchema
    onSelected: () => void;
    isSelected: boolean;
    onClick: () => void;
    onDelete?: () => void;
}

export type SidebarItemButton = {
    type: SidebarItemTypes.BUTTON
    text: string
    isAdd?: boolean;
    isSelected?: boolean;
    onClick: () => void;
}

export type SidebarItem = SidebarItemProgram | SidebarItemButton

export type SidebarItems = {[category: string] : SidebarItem[]} 

export interface SidebarProps {
    items: SidebarItems
}

export const Sidebar: FC<SidebarProps> = ({items}) => {
    return <div className="sidebar__container">
        {
            Object.entries(items).map(([category, items]) => {
                return <>
                <div className="sidebar__header">{category}</div>
                {
                    items.map((item,index) => {
                        if(item.type == SidebarItemTypes.BUTTON){
                            return <SidebarItem key={index} isAdd={item.isAdd} isSelected={item.isSelected} onClick={item.onClick} >{item.text}</SidebarItem>
                        }
                        if(item.type == SidebarItemTypes.PROGRAM){
                            return <SidebarItem key={item.value.id} onDelete={item.onDelete} showDelete={item.onDelete != null} onClick={item.onClick} isSelected={item.isSelected}>{item.value.programName}</SidebarItem>
                        }
                        return <></>
                    })
                }
                </>
            })
        }
    </div>
}