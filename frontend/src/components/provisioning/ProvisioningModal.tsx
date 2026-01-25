
'use client';

import React, { useState, useEffect } from 'react';
import { useWebSerial, SerialDeviceIdentity } from '../../hooks/useWebSerial';
import { Button, Modal, Input, message, Steps, Spin, Alert } from 'antd';
import { UsbOutlined, WifiOutlined, CheckCircleOutlined, CloudServerOutlined } from '@ant-design/icons';
import apiClient from '../../lib/api';

interface IProvisioningModalProps {
    visible: boolean;
    onClose: () => void;
    currentServiceType?: string; // e.g. 'waterwall'
    currentServiceId?: string;
    currentOrganizationId?: string;
    currentServiceName?: string;
    eventId?: string;
    deptId?: string;
}

const ProvisioningModal: React.FC<IProvisioningModalProps> = ({
    visible, onClose, currentServiceType = 'waterwall', currentServiceId, currentOrganizationId, currentServiceName, eventId, deptId
}) => {
    const { isConnected, requestPort, sendCommand, logs, identity } = useWebSerial();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form State
    const [wifiSSID, setWifiSSID] = useState('');
    const [wifiPass, setWifiPass] = useState('');
    const [deviceCode, setDeviceCode] = useState('');
    const [location, setLocation] = useState('');
    const [host, setHost] = useState('a3a0yoo2557wbr-ats.iot.me-central-1.amazonaws.com');

    // Use Env Var for API URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Fallback: Try to get Organization ID from logged-in user if not passed as prop
    const [finalOrgId, setFinalOrgId] = useState(currentOrganizationId);

    useEffect(() => {
        if (!finalOrgId) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.organization_id) {
                        console.log('Using User Org ID:', user.organization_id);
                        setFinalOrgId(user.organization_id);
                    }
                } catch (e) {
                    console.error('Failed to parse user from storage');
                }
            }
        }
    }, [currentOrganizationId]);

    // Step 1: Handshake Effect
    useEffect(() => {
        if (isConnected && currentStep === 0) {
            const interval = setInterval(() => {
                if (!identity) {
                    sendCommand('admin:identify');
                } else {
                    clearInterval(interval);
                    console.log('Device Identity Received:', identity);
                    verifyIdentity(identity);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isConnected, identity]);

    const verifyIdentity = (id: SerialDeviceIdentity) => {
        if (id.type !== currentServiceName) {
            message.error(`Type Mismatch! Device is '${id.type}', expected '${currentServiceName}'`);
            return;
        }
        message.success(`Verified: ${id.hw_id}`);
        setCurrentStep(1); // Move to Registration
    };

    const handleRegister = async () => {
        if (!deviceCode || !location) {
            message.error('Please enter Name and Location');
            return;
        }
        if (!identity) return;

        setLoading(true);
        console.log('Registering Device:', identity.hw_id);

        try {
            await apiClient.post('/devices/register', {
                hardware_id: identity.hw_id,
                device_code: deviceCode,
                location: location,
                service_id: currentServiceId,
                organization_id: finalOrgId,
                department_id: deptId,
                event_id: eventId,
                host: host
            });

            message.success('Device Registered in Cloud!');
            setCurrentStep(2); // Move to WiFi Config
        } catch (error: any) {
            console.error('Registration Error:', error);
            const errMsg = error.response?.data?.error || 'Registration Failed';
            message.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigure = async () => {
        if (!wifiSSID || !wifiPass) return message.error('Enter WiFi Credentials');
        if (!finalOrgId) return message.error('No Organization Context');

        setLoading(true);
        // Send config via serial
        const configCmd = JSON.stringify({
            ssid: wifiSSID,
            pass: wifiPass,
            org: finalOrgId,
            host: host,
            service_id: currentServiceId,
            department_id: deptId,
            event_id: eventId
        });

        await sendCommand(`admin:config ${configCmd}`);

        setTimeout(() => {
            message.success('Configuration Sent! Device should reboot.');
            setLoading(false);
            onClose();
        }, 2000);
    };

    return (
        <Modal
            title="Add New Device (USB Provisioning)"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={700}
        >
            <Steps current={currentStep} items={[
                { title: 'Connect', icon: <UsbOutlined /> },
                { title: 'Register', icon: <CloudServerOutlined /> },
                { title: 'Configure', icon: <WifiOutlined /> },
                { title: 'Done', icon: <CheckCircleOutlined /> }
            ]} style={{ marginBottom: 20 }} />

            {/* STEP 0: CONNECT */}
            {currentStep === 0 && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                    {!isConnected ? (
                        <Button type="primary" size="large" icon={<UsbOutlined />} onClick={requestPort}>
                            Connect via USB
                        </Button>
                    ) : (
                        <div>
                            <Spin tip="Verifying Device Type...">
                                <div style={{ height: 50, marginBottom: 10 }} />
                            </Spin>
                            <div>Listening for handshake...</div>
                            <pre style={{ textAlign: 'left', background: '#f0f0f0', padding: 10, marginTop: 10, maxHeight: 100, overflow: 'auto' }}>
                                {logs.join('\n')}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 1: REGISTER */}
            {currentStep === 1 && (
                <div>
                    <Alert
                        message="Device Identified"
                        description={`Hardware ID: ${identity?.hw_id}`}
                        type="success"
                        showIcon
                        style={{ marginBottom: 15 }}
                    />

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Organization ID</label>
                            <Input value={finalOrgId} disabled className="bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Service ID</label>
                            <Input value={currentServiceId} disabled className="bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Department ID</label>
                            <Input value={deptId} disabled className="bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Event ID</label>
                            <Input value={eventId} disabled className="bg-gray-50" />
                        </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <label>Friendly Name / Device Code:</label>
                        <Input
                            placeholder="e.g. ORG1_Main_Sensor"
                            value={deviceCode}
                            onChange={e => setDeviceCode(e.target.value)}
                        />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <label>Physical Location:</label>
                        <Input
                            placeholder="e.g. North Wall"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                        />
                    </div>

                    <div style={{ marginBottom: 15 }}>
                        <label>Host Endpoint:</label>
                        <Input
                            placeholder="IoT Endpoint"
                            value={host}
                            onChange={e => setHost(e.target.value)}
                        />
                    </div>

                    <Button type="primary" block onClick={handleRegister} loading={loading}>
                        Register Device
                    </Button>
                </div>
            )}

            {/* STEP 2: CONFIGURE WIFI */}
            {currentStep === 2 && (
                <div>
                    <Alert message="Device Registered" description="Now configure WiFi credentials." type="info" showIcon style={{ marginBottom: 15 }} />

                    <div style={{ marginBottom: 10 }}>
                        <label>WiFi SSID:</label>
                        <Input value={wifiSSID} onChange={e => setWifiSSID(e.target.value)} />
                    </div>
                    <div style={{ marginBottom: 15 }}>
                        <label>WiFi Password:</label>
                        <Input.Password value={wifiPass} onChange={e => setWifiPass(e.target.value)} />
                    </div>

                    <Button type="primary" block onClick={handleConfigure} loading={loading}>
                        Write Config & Reboot
                    </Button>
                </div>
            )}

        </Modal>
    );
};

export default ProvisioningModal;
