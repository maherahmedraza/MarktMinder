import type { Meta, StoryObj } from '@storybook/react';
import { DealCard } from './DealCard';

const meta: Meta<typeof DealCard> = {
    title: 'Features/DealCard',
    component: DealCard,
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="max-w-sm p-4">
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof DealCard>;

const mockDeal = {
    id: '1',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    image_url: 'https://m.media-amazon.com/images/I/51SKmu2G9FL._AC_UF894,1000_QL80_.jpg',
    marketplace: 'Amazon',
    current_price: 299.99,
    currency: 'EUR',
    score: 85,
    original_price: 419.00,
    discount_percentage: 28,
    recommendation: 'Historical low price detected. Great time to buy.',
    reason: 'Price dropped significantly below 90-day average.',
};

export const HighScore: Story = {
    args: {
        deal: mockDeal,
    },
};

export const MediumScore: Story = {
    args: {
        deal: {
            ...mockDeal,
            score: 65,
            discount_percentage: 15,
            current_price: 356.15,
            recommendation: 'Good discount, but has been lower previously.',
        },
    },
};

export const LowScore: Story = {
    args: {
        deal: {
            ...mockDeal,
            score: 45,
            discount_percentage: 5,
            current_price: 398.00,
            recommendation: 'Waiting is recommended. Price is trending down slowly.',
        },
    },
};

export const NoImage: Story = {
    args: {
        deal: {
            ...mockDeal,
            image_url: '',
        },
    },
};
