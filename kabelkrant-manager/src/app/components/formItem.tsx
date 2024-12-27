import { FC } from "react";

export interface FormItemProps {
    label: string,
    children: React.ReactNode
    labelWidth?: number
}

export const FormItem: FC<FormItemProps> = ({children,label,labelWidth}) => {
    return <div className="flex gap-5 justify-start items-center px-2 ">
        <div style={{minWidth:labelWidth }} className="font-bold">{label}</div>
        {children}
    </div>
}
