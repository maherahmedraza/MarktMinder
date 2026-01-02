
import Link from 'next/link';
import { TrendingDown, TrendingUp, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';

interface DealCardProps {
    deal: {
        id: string;
        title: string;
        image_url: string;
        marketplace: string;
        current_price: number;
        currency: string;
        score: number;
        original_price?: number;
        discount_percentage?: number;
        recommendation?: string;
        reason?: string;
    };
}

export function DealCard({ deal }: DealCardProps) {
    // Determine score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20 ring-green-500/20';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20 ring-yellow-500/20';
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800 ring-gray-500/20';
    };

    const scoreColor = getScoreColor(deal.score);

    return (
        <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all duration-300 hover:shadow-lg overflow-hidden flex flex-col h-full">
            {/* Image Section */}
            <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-900 overflow-hidden">
                {deal.image_url ? (
                    <img
                        src={deal.image_url}
                        alt={deal.title}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">📦</span>
                    </div>
                )}

                {/* Marketplace Badge */}
                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-sm ${deal.marketplace === 'amazon' ? 'text-orange-600 dark:text-orange-400' :
                        deal.marketplace === 'otto' ? 'text-red-600 dark:text-red-400' :
                            'text-purple-600 dark:text-purple-400'
                    }`}>
                    {deal.marketplace}
                </span>

                {/* Score Badge */}
                <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset backdrop-blur shadow-sm ${scoreColor}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Score {deal.score}
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex-1 flex flex-col">
                <Link href={`/dashboard/products/${deal.id}`} className="block">
                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {deal.title}
                    </h3>
                </Link>

                {/* Price Section */}
                <div className="mt-auto pt-4">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                            {deal.currency} {deal.current_price.toFixed(2)}
                        </span>
                        {deal.original_price && deal.original_price > deal.current_price && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 line-through decoration-red-500/50">
                                {deal.currency} {deal.original_price.toFixed(2)}
                            </span>
                        )}
                    </div>

                    {/* Savings & Recommendation */}
                    <div className="flex items-center justify-between mt-3 text-sm">
                        {deal.discount_percentage ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                <TrendingDown className="w-3.5 h-3.5" />
                                -{deal.discount_percentage}%
                            </span>
                        ) : (
                            <span />
                        )}

                        <Link
                            href={`/dashboard/products/${deal.id}`}
                            className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium hover:underline"
                        >
                            Analyze
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* AI Insight */}
                    {deal.recommendation && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                                <AlertCircle className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">{deal.recommendation}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
