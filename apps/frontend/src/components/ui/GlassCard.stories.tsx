import type { Meta, StoryObj } from '@storybook/react';
import { GlassCard } from './GlassCard';

const meta: Meta<typeof GlassCard> = {
    title: 'UI/GlassCard',
    component: GlassCard,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'elevated', 'interactive', 'pro', 'glass'],
        },
        padding: {
            control: 'select',
            options: ['none', 'sm', 'default', 'lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof GlassCard>;

export const Default: Story = {
    args: {
        children: <div className="text-text-primary">This is a default glass card content.</div>,
        variant: 'default',
    },
};

export const Elevated: Story = {
    args: {
        children: <div className="text-text-primary">This is an elevated glass card.</div>,
        variant: 'elevated',
    },
};

export const Interactive: Story = {
    args: {
        children: <div className="text-text-primary">Hover me! I am interactive.</div>,
        variant: 'interactive',
    },
};

export const Pro: Story = {
    args: {
        children: (
            <div className="relative z-10 text-text-primary">
                <h3 className="text-lg font-bold">Pro Feature</h3>
                <p>This card has special pro styling effects.</p>
            </div>
        ),
        variant: 'pro',
        className: 'min-h-[200px]',
    },
};
