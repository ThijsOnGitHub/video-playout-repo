import { StoryObj } from "@storybook/react";
import { SidebarItem, SidebarItemProps } from "../components/sidebar/sidebarItem";

export default {
    component: SidebarItem
}

export const Selected: StoryObj<SidebarItemProps> = {
    args: {
        children: "Sidebar Item",
        isSelected: true
    },
    parameters: {
        layout: "padded"
    }
}

export const NotSelected: StoryObj<SidebarItemProps> = {
    args: {
        children: "Sidebar Item",
        isSelected: false
    },
    parameters: {
        layout: "padded"
    }
}

export const Adding: StoryObj<SidebarItemProps> = {
    args: {
        children: "Sidebar Item",
        isSelected: false,
        isAdd: true
    },
    parameters: {
        layout: "padded"
    }
}