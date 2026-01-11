'use client';

import { Wrench, Clock, Mail, Phone } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export default function MaintenancePage() {
    const { settings } = useSettings();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center">
                {/* Animated Icon */}
                <div className="relative mb-8">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/30 animate-pulse">
                        <Wrench className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-white mb-4">
                    Under Maintenance
                </h1>

                {/* Message */}
                <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                    {settings?.maintenance_message ||
                        "We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly."}
                </p>

                {/* Progress Bar Animation */}
                <div className="w-full bg-slate-700 rounded-full h-2 mb-8 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>

                {/* Contact Info */}
                {(settings?.support_email || settings?.support_phone) && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
                        <h3 className="text-white font-semibold mb-4">Need help urgently?</h3>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {settings?.support_email && (
                                <a
                                    href={`mailto:${settings.support_email}`}
                                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                                >
                                    <Mail className="w-4 h-4" />
                                    <span>{settings.support_email}</span>
                                </a>
                            )}
                            {settings?.support_phone && (
                                <a
                                    href={`tel:${settings.support_phone}`}
                                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span>{settings.support_phone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Logo/Brand */}
                <div className="mt-8 text-slate-500 text-sm">
                    {settings?.system_name || 'SustainPro'} • {settings?.site_tagline || 'IoT Platform'}
                </div>
            </div>
        </div>
    );
}
