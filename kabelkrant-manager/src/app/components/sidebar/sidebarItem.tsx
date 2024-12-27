import { FC } from "react";
import add from "../../assets/add.svg";
import { Trash2 } from "lucide-react";


export interface SidebarItemProps {
    isAdd?: boolean;
    isSelected?: boolean;
    children?: React.ReactNode
    showDelete?: boolean;
    onDelete?: () => void;
}

export const SidebarItem: FC<SidebarItemProps & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({ isSelected = false, children, isAdd = false, showDelete = false, onDelete, ...props }) => {
    return <div {...props} className={"sidebar-item__container " + (isSelected ? " sidebar-item__container--selected" : "") }>
        {isAdd && <img className="sidebar-item__add-icon" src={add} />}{children}{showDelete && <Trash2 onClick={onDelete} width={15} height={15} />}</div>
}