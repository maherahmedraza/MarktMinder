import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
    title: 'UI/ConfirmDialog',
    component: ConfirmDialog,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'warning', 'danger'],
        },
        isOpen: { control: 'boolean' },
        isLoading: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
    args: {
        isOpen: true,
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed with this action?',
        onClose: () => console.log('closed'),
        onConfirm: () => console.log('confirmed'),
    },
};

export const Danger: Story = {
    args: {
        isOpen: true,
        variant: 'danger',
        title: 'Delete Product',
        message: 'Are you sure you want to delete "Sony WH-1000XM5"? This will also remove all price history and alerts.',
        confirmText: 'Delete',
        cancelText: 'Keep',
        itemCount: 1,
    },
};

export const Warning: Story = {
    args: {
        isOpen: true,
        variant: 'warning',
        title: 'Archive Project',
        message: 'This project will be archived and read-only. You can unarchive it later.',
        confirmText: 'Archive',
    },
};

export const Loading: Story = {
    args: {
        isOpen: true,
        variant: 'danger',
        title: 'Deleting...',
        message: 'Please wait while we process your request.',
        isLoading: true,
    },
};
