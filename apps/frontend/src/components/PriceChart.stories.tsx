import type { Meta, StoryObj } from '@storybook/react';
import { PriceChart } from './PriceChart';

const meta: Meta<typeof PriceChart> = {
    title: 'Visualizations/PriceChart',
    component: PriceChart,
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="h-[400px] w-full p-6 bg-surface rounded-xl">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof PriceChart>;

const generateData = (days: number, startPrice: number) => {
    const data = [];
    const now = new Date();
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Random price movement
        const randomChange = (Math.random() - 0.5) * 10;
        const price = Math.max(0, startPrice + randomChange + Math.sin(i / 5) * 20);

        data.push({
            time: date.toISOString(),
            price,
        });
    }
    return data;
};

export const Default: Story = {
    args: {
        data: generateData(30, 150),
    },
};

export const VolatileProduct: Story = {
    args: {
        data: generateData(90, 500),
    },
};

export const Empty: Story = {
    args: {
        data: [],
    },
};
