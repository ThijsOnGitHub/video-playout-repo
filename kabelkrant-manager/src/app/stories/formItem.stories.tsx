import { FormItem, FormItemProps } from "@/components/formItem";
import { Input } from "@/components/ui/input";
import { Meta, StoryObj } from "@storybook/react";

export default {
    component: FormItem
} as Meta<FormItemProps>

export const Default: StoryObj<FormItemProps> = {
    args: {
        children: <Input/>
    }
}