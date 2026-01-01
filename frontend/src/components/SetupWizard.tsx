import { ArrowLeft, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export interface WikiStep {
    id: string; // Keep as string for flexibility
    label: string;
}

interface SetupWizardProps {
    // Header
    title: string;
    description?: string;
    breadcrumbs: { label: string; href: string }[];

    // Steps
    steps: WikiStep[];
    currentStep: number;

    // Navigation
    onNext?: () => void;
    onBack?: () => void;
    nextLabel?: string;
    backLabel?: string;
    isLastStep?: boolean;
    isLoading?: boolean;

    // Actions - Top Right (usually Cancel)
    // If not provided, defaults to rendering a Cancel button that goes back
    onCancel?: () => void;

    // Content
    children: ReactNode;

    // Additional classes
    className?: string;

    // Optional props for "Single Step" mode or simplified views
    hideSidebar?: boolean;
}

export default function SetupWizard({
    title,
    description,
    breadcrumbs,
    steps,
    currentStep,
    onNext,
    onBack,
    nextLabel = 'Next Step',
    backLabel = 'Back',
    isLastStep = false,
    isLoading = false,
    onCancel,
    children,
    className = '',
    hideSidebar = false
}: SetupWizardProps) {
    const router = useRouter();

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            // Navigate to the first breadcrumb (the "Back to..." link)
            router.push(breadcrumbs[0].href);
        }
    };

    return (
        <div className={`page-padding max-w-[1600px] mx-auto py-6 ${className}`}>
            {/* Standardized Header */}
            <div className="flex flex-col gap-4 mb-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {breadcrumbs.map((crumb, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            {idx > 0 && <span>/</span>}
                            {idx === breadcrumbs.length - 1 ? (
                                <span className="text-foreground font-medium">{crumb.label}</span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => router.push(crumb.href)}
                                    className="hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                    {idx === 0 && <ArrowLeft className="w-3 h-3" />}
                                    {crumb.label}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Steps Sidebar (conditionally rendered) */}
                {!hideSidebar && (
                    <div className="hidden lg:block space-y-1">
                        {steps.map((step, idx) => {
                            const isActive = currentStep === idx;
                            const isCompleted = currentStep > idx;

                            return (
                                <div
                                    key={step.id}
                                    className={`relative flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : isCompleted
                                            ? 'text-muted-foreground'
                                            : 'text-muted-foreground/60'
                                        }`}
                                >
                                    {/* Active Indicator Line (Optional, decorative) */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-white/20 rounded-r-full" />
                                    )}

                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isActive ? 'bg-white text-primary' :
                                        isCompleted ? 'bg-green-500 text-white' :
                                            'bg-muted border border-border'
                                        }`}>
                                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                    </div>
                                    <span className={`font-medium tracking-tight ${isActive ? 'text-sm' : 'text-sm'}`}>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Main Content Area */}
                <div className={hideSidebar ? 'lg:col-span-4' : 'lg:col-span-3'}>
                    <div className="bg-card border border-border rounded-xl p-8 min-h-[500px] flex flex-col relative">
                        {/* Content */}
                        <div className="flex-1">
                            {children}
                        </div>

                        {/* Navigation Footer - Only show if onNext or onBack are provided */}
                        {(onNext || onBack) && (
                            <div className="pt-6 mt-6 border-t border-border flex items-center gap-3">
                                {onBack && (
                                    <button
                                        onClick={onBack}
                                        disabled={currentStep === 0}
                                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {backLabel}
                                    </button>
                                )}
                                {onNext && (
                                    <button
                                        onClick={onNext}
                                        disabled={isLoading}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Processing...' : isLastStep ? 'Create' : nextLabel}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
