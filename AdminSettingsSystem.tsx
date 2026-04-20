import React, { useState, useEffect } from 'react';
import { User, PlatformSettings } from './models';
import { Card, Button, Input, Loader } from './widgets';
import { 
  Settings as SettingsIcon, Palette, Globe, Shield, CreditCard, 
  Bell, BarChart, Server, Image as ImageIcon, Save, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getPlatformSettings, updatePlatformSettings } from './firestoreService';
import { uploadMedia } from './storageService';

const DEFAULT_SETTINGS: PlatformSettings = {
  id: 'global',
  branding: {
    logoLight: '',
    logoDark: '',
    favicon: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#f43f5e',
    fontFamily: 'Inter',
    themeStyle: 'modern',
    borderRadius: 'md',
  },
  general: {
    siteName: 'Pro Platform',
    tagline: 'The ultimate application',
    seoDescription: 'Built for scale and performance.',
    maintenanceMode: false,
    defaultLanguage: 'en',
    timezone: 'UTC',
  },
  financial: {
    platformCommission: 10,
    minWithdrawal: 50,
    transactionFee: 2.5,
    currency: 'USD',
    enableNagad: true,
    enableBkash: true,
    enableCard: true,
  },
  security: {
    require2FA: false,
    sessionTimeoutHours: 24,
    maxLoginAttempts: 5,
  },
  integrations: {
    googleAnalyticsId: '',
    facebookPixel: '',
  },
  advanced: {
    debugMode: false,
    maxUploadSizeMB: 50,
    enableCaching: true,
  }
};

export const AdminSettingsSystem = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'general' | 'financial' | 'security' | 'integrations' | 'advanced'>('branding');
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const fetched = await getPlatformSettings();
    if (fetched) {
      setSettings(fetched);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePlatformSettings(settings, currentUser.uid);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = <K extends keyof PlatformSettings>(section: K, key: keyof PlatformSettings[K], value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, section: keyof PlatformSettings, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const toastId = toast.loading('Uploading image...');
    try {
      const url = await uploadMedia(file, `branding/${key}`);
      updateSection(section, key as keyof PlatformSettings[typeof section], url);
      toast.success('Image uploaded successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to upload image', { id: toastId });
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Settings Navigation Sidebar */}
      <Card className="w-full lg:w-64 p-2 h-fit flex flex-row border-none shadow-none bg-transparent lg:border lg:shadow-sm lg:bg-white dark:lg:bg-gray-800 lg:flex-col gap-1 overflow-x-auto">
        <button onClick={() => setActiveTab('branding')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${activeTab === 'branding' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
          <Palette size={18} /> Branding & Styling
        </button>
        <button onClick={() => setActiveTab('general')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
          <Globe size={18} /> General Settings
        </button>
        <button onClick={() => setActiveTab('financial')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${activeTab === 'financial' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
          <CreditCard size={18} /> Payment & Fin
        </button>
        <button onClick={() => setActiveTab('security')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${activeTab === 'security' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
          <Shield size={18} /> Security Rules
        </button>
        <button onClick={() => setActiveTab('integrations')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${activeTab === 'integrations' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
          <BarChart size={18} /> Integrations
        </button>
        <button onClick={() => setActiveTab('advanced')} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${activeTab === 'advanced' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30' : 'hover:bg-gray-50 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/50'}`}>
          <Server size={18} /> Advanced
        </button>
      </Card>

      {/* Settings Content Area */}
      <div className="flex-1 space-y-6">
        {/* BRANDING TAB */}
        {activeTab === 'branding' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2"><Palette className="text-indigo-600"/> Branding & Styling</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-100 dark:border-gray-800 pb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo (Light Mode)</label>
                <div className="flex items-end gap-4">
                  <div className="w-32 h-16 bg-gray-50 dark:bg-gray-900 border rounded flex items-center justify-center overflow-hidden">
                    {settings.branding.logoLight ? <img src={settings.branding.logoLight} className="max-h-full max-w-full object-contain" alt=""/> : <ImageIcon className="text-gray-300"/>}
                  </div>
                  <label className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'branding', 'logoLight')} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo (Dark Mode)</label>
                <div className="flex items-end gap-4">
                  <div className="w-32 h-16 bg-gray-900 border border-gray-700 rounded flex items-center justify-center overflow-hidden">
                    {settings.branding.logoDark ? <img src={settings.branding.logoDark} className="max-h-full max-w-full object-contain" alt=""/> : <ImageIcon className="text-gray-600"/>}
                  </div>
                  <label className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'branding', 'logoDark')} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Favicon</label>
                <div className="flex items-end gap-4">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 border rounded flex items-center justify-center overflow-hidden">
                    {settings.branding.favicon ? <img src={settings.branding.favicon} className="w-full h-full object-cover" alt=""/> : <span className="text-[10px] text-gray-400">32x32</span>}
                  </div>
                  <label className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'branding', 'favicon')} />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Color</label>
                <div className="flex gap-3">
                  <input type="color" value={settings.branding.primaryColor} onChange={e => updateSection('branding', 'primaryColor', e.target.value)} className="h-10 w-20 rounded border border-gray-300" />
                  <Input value={settings.branding.primaryColor} onChange={e => updateSection('branding', 'primaryColor', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secondary Color</label>
                <div className="flex gap-3">
                  <input type="color" value={settings.branding.secondaryColor} onChange={e => updateSection('branding', 'secondaryColor', e.target.value)} className="h-10 w-20 rounded border border-gray-300" />
                  <Input value={settings.branding.secondaryColor} onChange={e => updateSection('branding', 'secondaryColor', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Font Family</label>
                <select value={settings.branding.fontFamily} onChange={e => updateSection('branding', 'fontFamily', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white">
                  <option value="Inter">Inter (Modern)</option>
                  <option value="Roboto">Roboto (Clean)</option>
                  <option value="Poppins">Poppins (Playful)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Tech)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Layout Style</label>
                <select value={settings.branding.themeStyle} onChange={e => updateSection('branding', 'themeStyle', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white">
                  <option value="modern">Modern (Default)</option>
                  <option value="minimal">Minimal / Clean</option>
                  <option value="playful">Playful / Vibrant</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Border Radius</label>
                <select value={settings.branding.borderRadius} onChange={e => updateSection('branding', 'borderRadius', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white">
                  <option value="none">Sharp (0px)</option>
                  <option value="sm">Small (4px)</option>
                  <option value="md">Medium (8px)</option>
                  <option value="lg">Large (16px)</option>
                  <option value="full">Pill (Rounded)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
               <p className="text-sm text-gray-500 mb-4">Preview Component styling based on selection:</p>
               <Button style={{ backgroundColor: settings.branding.primaryColor, borderRadius: settings.branding.borderRadius === 'none' ? '0' : settings.branding.borderRadius === 'sm' ? '4px' : settings.branding.borderRadius === 'md' ? '8px' : settings.branding.borderRadius === 'lg' ? '16px' : '9999px', fontFamily: settings.branding.fontFamily }}>Theme Button Preview</Button>
            </div>
          </Card>
        )}

        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2"><Globe className="text-indigo-600"/> General Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform Name</label>
                <Input value={settings.general.siteName} onChange={e => updateSection('general', 'siteName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
                <Input value={settings.general.tagline} onChange={e => updateSection('general', 'tagline', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEO Description</label>
                <textarea rows={3} value={settings.general.seoDescription} onChange={e => updateSection('general', 'seoDescription', e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Language</label>
                  <select value={settings.general.defaultLanguage} onChange={e => updateSection('general', 'defaultLanguage', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-600">
                    <option value="en">English (EN)</option>
                    <option value="bn">Bengali (BN)</option>
                    <option value="ar">Arabic (AR)</option>
                    <option value="es">Spanish (ES)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                  <select value={settings.general.timezone} onChange={e => updateSection('general', 'timezone', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-600">
                    <option value="UTC">UTC</option>
                    <option value="Asia/Dhaka">Asia/Dhaka (BDT)</option>
                    <option value="America/New_York">America/New York (EST)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-500">Maintenance Mode</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400">Put the site offline for users. Admins can still access the dashboard.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.general.maintenanceMode} onChange={e => updateSection('general', 'maintenanceMode', e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* FINANCIAL TAB */}
        {activeTab === 'financial' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2"><CreditCard className="text-indigo-600"/> Payment & Financial Settings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform Commission (%)</label>
                <Input type="number" value={settings.financial.platformCommission} onChange={e => updateSection('financial', 'platformCommission', Number(e.target.value))} />
                <p className="text-xs text-gray-500 mt-1">Percentage taken from host/seller earnings.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Withdrawal</label>
                <Input type="number" value={settings.financial.minWithdrawal} onChange={e => updateSection('financial', 'minWithdrawal', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Fee (Fixed)</label>
                <Input type="number" value={settings.financial.transactionFee} onChange={e => updateSection('financial', 'transactionFee', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Currency</label>
                <select value={settings.financial.currency} onChange={e => updateSection('financial', 'currency', e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 dark:bg-gray-800 dark:border-gray-600">
                  <option value="USD">USD ($)</option>
                  <option value="BDT">BDT (৳)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <h4 className="font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Active Payment Gateways & Configurations</h4>
            <div className="space-y-4 pl-2">
              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.financial.enableNagad} onChange={e => updateSection('financial', 'enableNagad', e.target.checked)} className="rounded text-indigo-600 w-5 h-5" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Nagad Mobile Banking</span>
                </label>
                {settings.financial.enableNagad && (
                  <div className="pl-8">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nagad Personal Number</label>
                    <Input value={settings.financial.nagadNumber || ''} onChange={e => updateSection('financial', 'nagadNumber', e.target.value)} placeholder="019XX-XXXXXX" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.financial.enableBkash} onChange={e => updateSection('financial', 'enableBkash', e.target.checked)} className="rounded text-indigo-600 w-5 h-5" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">bKash Mobile Banking</span>
                </label>
                {settings.financial.enableBkash && (
                  <div className="pl-8">
                    <label className="block text-xs font-medium text-gray-500 mb-1">bKash Personal Number</label>
                    <Input value={settings.financial.bKashNumber || ''} onChange={e => updateSection('financial', 'bKashNumber', e.target.value)} placeholder="017XX-XXXXXX" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={settings.financial.enableCard} onChange={e => updateSection('financial', 'enableCard', e.target.checked)} className="rounded text-indigo-600 w-5 h-5" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Rocket / Others</span>
                </label>
                {settings.financial.enableCard && (
                  <div className="pl-8">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Rocket Personal Number</label>
                    <Input value={settings.financial.rocketNumber || ''} onChange={e => updateSection('financial', 'rocketNumber', e.target.value)} placeholder="01XXX-XXXXXX" />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manual Payment Instructions (Displayed to Users)</label>
                <textarea 
                  value={settings.financial.paymentInstructions || ''} 
                  onChange={e => updateSection('financial', 'paymentInstructions', e.target.value)}
                  placeholder="E.g., Send money to the personal numbers and submit your Transaction ID to get approval."
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows={4}
                />
              </div>
            </div>
          </Card>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2"><Shield className="text-indigo-600"/> Security & Abuse Rules</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Require 2FA</h4>
                  <p className="text-sm text-gray-500">Force all admins and hosts to use Two-Factor Authentication</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.security.require2FA} onChange={e => updateSection('security', 'require2FA', e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Timeout (Hours)</label>
                  <Input type="number" value={settings.security.sessionTimeoutHours} onChange={e => updateSection('security', 'sessionTimeoutHours', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Login Attempts (Lockout)</label>
                  <Input type="number" value={settings.security.maxLoginAttempts} onChange={e => updateSection('security', 'maxLoginAttempts', Number(e.target.value))} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* INTEGRATIONS TAB */}
        {activeTab === 'integrations' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2"><BarChart className="text-indigo-600"/> Integrations & Tracking</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Analytics Tracking ID (G-XXXXXXX)</label>
                <Input value={settings.integrations.googleAnalyticsId} onChange={e => updateSection('integrations', 'googleAnalyticsId', e.target.value)} placeholder="e.g. G-123456789" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facebook Pixel ID</label>
                <Input value={settings.integrations.facebookPixel} onChange={e => updateSection('integrations', 'facebookPixel', e.target.value)} placeholder="e.g. 123456789012345" />
              </div>
            </div>
          </Card>
        )}

        {/* ADVANCED TAB */}
        {activeTab === 'advanced' && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2"><Server className="text-indigo-600"/> Advanced Settings</h3>
            
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Enable Deep Caching</h4>
                  <p className="text-sm text-gray-500">Improves performance but changes may take longer to reflect</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.advanced.enableCaching} onChange={e => updateSection('advanced', 'enableCaching', e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

               <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Debug Mode</h4>
                  <p className="text-sm text-gray-500">Show detailed stack traces on errors (Not recommended for prod)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.advanced.debugMode} onChange={e => updateSection('advanced', 'debugMode', e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Media Upload Size (MB)</label>
                <Input type="number" value={settings.advanced.maxUploadSizeMB} onChange={e => updateSection('advanced', 'maxUploadSizeMB', Number(e.target.value))} />
              </div>
            </div>
          </Card>
        )}

        {/* Global Save Button */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 -mx-4 sm:-mx-8 lg:mx-0 lg:rounded-xl lg:border flex justify-end">
          <Button variant="primary" onClick={handleSave} isLoading={saving} className="gap-2">
            <Save size={18} /> Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
