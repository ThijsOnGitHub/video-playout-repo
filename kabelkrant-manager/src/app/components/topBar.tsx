import {  FC } from "react";
import tvLogo from '../assets/tvLogo.svg'

export interface TopBarProps {
    children?: React.ReactNode
}

export const TopBar: FC<TopBarProps> = ({children}) => {
    return <div className="top-bar__container flex justify-between">
        <div className="flex gap-5"> 
            <img className="top-bar__logo" src={tvLogo}/>
            <div className="top-bar__text">Kabelkrant manager</div>
        </div>
        {children}
    </div>
}