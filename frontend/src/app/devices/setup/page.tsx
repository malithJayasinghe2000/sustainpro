'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SerialProvisioner from '@/components/devices/SerialProvisioner';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

export default function DeviceSetupPage() {
    const { user } = useAuth();

    const handleProvision = async (serial: string, model: string, ssid: string, pass: string) => {
        if (!user) throw new Error("Not authenticated");

        // Call Backend to register using API client
        const response = await apiClient.post('/devices/provision', {
            serial_number: serial,
            model_id: model,
            name: `Device-${serial.substring(0, 4)}` // Default name
        });

        const data = response.data;
        if (!data.success) {
            throw new Error(data.error || "Provisioning failed");
        }

        // Use server_url from backend (fetched from database settings)
        return {
            device_code: data.data.device_code,
            api_key: data.data.api_key,
            server_url: data.data.server_url
        };
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-8 p-6">
                <div>
                    <h1 className="text-3xl font-bold">Add New Device</h1>
                    <p className="text-muted-foreground">Setup via USB Cable</p>
                </div>

                <SerialProvisioner
                    onProvision={handleProvision}
                    onSuccess={() => {
                        // Don't auto-redirect - let user see the success details
                        console.log('Device provisioned successfully!');
                    }}
                />
            </div>
        </DashboardLayout>
    );
}
