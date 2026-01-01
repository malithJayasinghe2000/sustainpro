
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    icon: LucideIcon;
    intent?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}

export default function StatsCard({
    title,
    value,
    subtext,
    icon: Icon,
    intent = 'primary',
    className = ''
}: StatsCardProps) {
    const iconColorMap = {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary dark:bg-primary/80 text-primary-foreground',
        success: 'bg-green-600 dark:bg-green-500 text-white',
        warning: 'bg-yellow-500 text-white',
        danger: 'bg-red-500 text-white'
    };

    return (
        <div className={`bg-card border border-border rounded-lg px-3 py-4 transition-colors ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                        {title}
                    </p>
                    <p className="text-2xl font-bold mt-1.5 text-foreground">{value}</p>
                    {subtext && (
                        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
                    )}
                </div>
                <div className={`p-2 rounded-lg ${iconColorMap[intent]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
