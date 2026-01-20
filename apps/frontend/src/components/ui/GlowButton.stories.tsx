import type { Meta, StoryObj } from '@storybook/react';
import { GlowButton } from './GlowButton';
import { Mail } from 'lucide-react';

const meta: Meta<typeof GlowButton> = {
    title: 'UI/GlowButton',
    component: GlowButton,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
        },
        size: {
            control: 'select',
            options: ['sm', 'default', 'lg', 'icon'],
        },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        hasGlow: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof GlowButton>;

export const Primary: Story = {
    args: {
        children: 'Primary Action',
        variant: 'primary',
    },
};

export const Secondary: Story = {
    args: {
        children: 'Secondary Action',
        variant: 'secondary',
    },
};

export const Outline: Story = {
    args: {
        children: 'Outline Button',
        variant: 'outline',
    },
};

export const Ghost: Story = {
    args: {
        children: 'Ghost Button',
        variant: 'ghost',
    },
};

export const Danger: Story = {
    args: {
        children: 'Delete Item',
        variant: 'danger',
    },
};

export const WithIcon: Story = {
    args: {
        children: (
            <>
                <Mail className="mr-2 h-4 w-4" />
                Email Login
            </>
        ),
        variant: 'primary',
    },
};

export const Loading: Story = {
    args: {
        children: 'Please wait',
        isLoading: true,
    },
};

export const Disabled: Story = {
    args: {
        children: 'Disabled',
        disabled: true,
    },
};
