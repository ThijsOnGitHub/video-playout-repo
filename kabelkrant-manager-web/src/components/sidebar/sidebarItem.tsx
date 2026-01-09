import type { FC, ReactNode, HTMLAttributes, DetailedHTMLProps } from "react";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog/DeleteConfirmDialog";

export interface SidebarItemProps {
  isAdd?: boolean;
  isSelected?: boolean;
  children?: ReactNode;
  showDelete?: boolean;
  onDelete?: () => void;
}

export const SidebarItem: FC<SidebarItemProps & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({
  isSelected = false,
  children,
  isAdd = false,
  showDelete = false,
  onDelete,
  className,
  ...props
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <div
        {...props}
        className={cn(
          "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150",
          "text-sm font-medium",
          isAdd
            ? "border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50"
            : isSelected
              ? "bg-[#99081f] text-white hover:bg-[#7a0619]"
              : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200",
          className
        )}
      >
        {isAdd && <Plus className="h-4 w-4 flex-shrink-0" />}
        <span className="flex-1 truncate">{children}</span>
        {showDelete && (
          <Trash2
            className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          />
        )}
      </div>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => onDelete?.()}
      />
    </>
  );
};
