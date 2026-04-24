import { useState, useEffect } from 'react';
import { User, LogOut, FileText, ChevronLeft, Save, Lock, Bell, Shield } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface UserSettingsPageProps {
 user: {
 id: string;
 name: string;
 email: string;
 role: 'ADMIN' | 'COORDINATOR';
 username?: string | null;
 pronouns?: string | null;
 theme?: string;
 notifications?: any;
 twoFactorEnabled?: boolean;
 };
 onUpdateUser: (updatedUser: any) => void;
}

export function UserSettingsPage({ user, onUpdateUser }: UserSettingsPageProps) {
 const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
 const [isLoading, setIsLoading] = useState(false);
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

 // Profile State
 const [name, setName] = useState(user.name);
 const [email, setEmail] = useState(user.email);
 const [username, setUsername] = useState(user.username || '');
 const [pronouns, setPronouns] = useState(user.pronouns || '');

 // Preferences State
 // Default to system if undefined, though useTheme handles this.
 // We don't need local state for theme anymore as next-themes handles it.
 const [notifications, setNotifications] = useState(user.notifications || { email: true, sms: false });

 // Password State
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');

 // 2FA State
 const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled || false);
 const [qrCode, setQrCode] = useState<string | null>(null);
 const [secret, setSecret] = useState<string | null>(null);
 const [token, setToken] = useState('');
 const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
 const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
 const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'success'>('idle');



 // Fetch fresh 2FA status
 useEffect(() => {
 const fetchStatus = async () => {
 try {
 const res = await fetch(`/api/users/${user.id}`);
 if (res.ok) {
 const data = await res.json();
 setTwoFactorEnabled(data.twoFactorEnabled);
 }
 } catch (e) {
 console.error(e);
 }
 };
 fetchStatus();
 }, [user.id]);

 const handleEnable2FA = async () => {
 setIsLoading(true);
 try {
 const res = await apiFetch('/api/auth/2fa/setup', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'generate' })
 });
 if (res.ok) {
 const data = await res.json();
 setQrCode(data.qrCodeUrl);
 setSecret(data.secret);
 setSetupStep('qr');
 }
 } catch (e) {
 setMessage({ type: 'error', text: 'Failed to start 2FA setup' });
 } finally {
 setIsLoading(false);
 }
 };

 const handleVerify2FA = async () => {
 setIsLoading(true);
 try {
 const res = await apiFetch('/api/auth/2fa/setup', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'enable', token, secret })
 });

 if (res.ok) {
 const data = await res.json();
 setTwoFactorEnabled(true);
 setRecoveryCodes(data.recoveryCodes);
 setSetupStep('success');
 setMessage({ type: 'success', text: '2FA Enabled Successfully' });
 } else {
 setMessage({ type: 'error', text: 'Invalid verification code' });
 }
 } catch (e) {
 setMessage({ type: 'error', text: 'Failed to enable 2FA' });
 } finally {
 setIsLoading(false);
 }
 };

 const handleDisable2FA = async () => {
 if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return;

 setIsLoading(true);
 try {
 const res = await apiFetch('/api/auth/2fa/setup', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'disable' })
 });
 if (res.ok) {
 setTwoFactorEnabled(false);
 setSetupStep('idle');
 setQrCode(null);
 setSecret(null);
 setMessage({ type: 'success', text: '2FA Disabled' });
 }
 } catch (e) {
 setMessage({ type: 'error', text: 'Failed to disable 2FA' });
 } finally {
 setIsLoading(false);
 }
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsLoading(true);
 setMessage(null);

 try {
 const response = await fetch(`/api/users/${user.id}`, {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 name,
 email,
 username,
 pronouns,
 notifications
 }),
 });

 if (!response.ok) {
 const errorData = await response.json();
 throw new Error(errorData.error || 'Failed to update settings');
 }

 const updatedData = await response.json();
 onUpdateUser(updatedData);
 setMessage({ type: 'success', text: 'Settings updated successfully' });
 } catch (error) {
 console.error('Error updating settings:', error);
 setMessage({ type: 'error', text: 'Failed to update settings. Please try again.' });
 } finally {
 setIsLoading(false);
 }
 };

 const handlePasswordChange = async (e: React.FormEvent) => {
 e.preventDefault();
 if (newPassword !== confirmPassword) {
 setMessage({ type: 'error', text: 'New passwords do not match' });
 return;
 }

 setIsLoading(true);
 // Mock password update
 setTimeout(() => {
 setIsLoading(false);
 setMessage({ type: 'success', text: 'Password updated successfully' });
 setCurrentPassword('');
 setNewPassword('');
 setConfirmPassword('');
 }, 1000);
 };

 return (
 <div className="bg-background h-full">
 {/* Header */}
 <header className="bg-surface border-b border-border sticky top-0 z-20">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between h-16">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
 <FileText className="w-5 h-5 text-white" />
 </div>
 <span className="font-bold text-xl text-text-primary">Settings</span>
 </div>
 </div>
 </div>
 </div>
 </header>

 <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
 {/* Sidebar Navigation */}
 <nav className="w-64 space-y-1">
 <button
 onClick={() => setActiveTab('profile')}
 className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'profile'
 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
 : 'text-text-secondary hover:bg-surface-raised  dark:hover:bg-gray-800'
 }`}
 >
 <User className="w-4 h-4" />
 Profile
 </button>
 <button
 onClick={() => setActiveTab('security')}
 className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security'
 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
 : 'text-text-secondary hover:bg-surface-raised  dark:hover:bg-gray-800'
 }`}
 >
 <Lock className="w-4 h-4" />
 Security
 </button>
 <button
 onClick={() => setActiveTab('preferences')}
 className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'preferences'
 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
 : 'text-text-secondary hover:bg-surface-raised  dark:hover:bg-gray-800'
 }`}
 >
 <Bell className="w-4 h-4" />
 Preferences
 </button>


 </nav>

 {/* Content Area */}
 <div className="flex-1 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
 <div className="p-6 sm:p-8">
 {message && (
 <div className={`mb-6 p-4 rounded-lg text-sm ${message.type === 'success'
 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
 : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
 }`}>
 {message.text}
 </div>
 )}

 {activeTab === 'profile' && (
 <form onSubmit={handleSave} className="space-y-6 max-w-lg">
 <h2 className="text-lg font-semibold text-text-primary mb-6">Profile Information</h2>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Full Name
 </label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Username
 </label>
 <input
 type="text"
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Email Address
 </label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Pronouns
 </label>
 <input
 type="text"
 value={pronouns}
 onChange={(e) => setPronouns(e.target.value)}
 placeholder="e.g. they/them"
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 />
 </div>

 <div className="pt-4">
 <button
 type="submit"
 disabled={isLoading}
 className="btn-primary flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
 >
 <Save className="w-4 h-4" />
 Save Changes
 </button>
 </div>
 </form>
 )}

 {activeTab === 'security' && (
 <div className="space-y-8">
 {/* 2FA Section */}
 <div>
 <h2 className="text-lg font-semibold text-text-primary mb-4">Two-Factor Authentication</h2>
 <div className="bg-surface-raised rounded-lg p-6 border border-border">
 <div className="flex items-start justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <Shield className={`w-5 h-5 ${twoFactorEnabled ? 'text-green-600' : 'text-text-muted'}`} />
 <span className="font-medium text-text-primary">
 {twoFactorEnabled ? '2FA is Enabled' : '2FA is Disabled'}
 </span>
 </div>
 <p className="text-sm text-text-muted">
 Protect your account by requiring an additional code when logging in.
 </p>
 </div>
 {twoFactorEnabled ? (
 <button
 onClick={handleDisable2FA}
 disabled={isLoading}
 className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
 >
 Disable 2FA
 </button>
 ) : (
 setupStep === 'idle' && (
 <button
 onClick={handleEnable2FA}
 disabled={isLoading}
 className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
 >
 Setup 2FA
 </button>
 )
 )}
 </div>

 {/* Setup Flow */}
 {!twoFactorEnabled && setupStep === 'qr' && (
 <div className="space-y-6 border-t border-border pt-6">
 <div className="grid md:grid-cols-2 gap-8">
 <div className="space-y-4">
 <p className="text-sm text-text-secondary">
 1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc).
 </p>
 {qrCode && (
 <div className="p-4 bg-white rounded-lg inline-block border border-border">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
 </div>
 )}
 <div className="text-xs text-text-muted font-mono bg-surface-raised p-2 rounded break-all">
 Secret: {secret}
 </div>
 </div>

 <div className="space-y-4">
 <p className="text-sm text-text-secondary">
 2. Enter the 6-digit code from your app to verify.
 </p>
 <div className="flex gap-2">
 <input
 type="text"
 value={token}
 onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
 placeholder="000000"
 className="w-32 px-4 py-2 text-center tracking-widest text-lg border border-border-strong rounded-lg bg-surface text-text-primary"
 />
 <button
 onClick={handleVerify2FA}
 disabled={isLoading || token.length !== 6}
 className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
 >
 Verify & Enable
 </button>
 </div>
 <p className="text-xs text-text-muted">
 Can&apos;t scan? Enter the secret key manually in your app.
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Success / Recovery Codes */}
 {((twoFactorEnabled && setupStep === 'success') || showRecoveryCodes) && (
 <div className="mt-6 border-t border-border pt-6">
 <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900/50">
 <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
 Save your Recovery Codes!
 </h3>
 <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
 If you lose access to your device, these codes are the only way to access your account.
 Store them somewhere safe.
 </p>
 <div className="grid grid-cols-2 gap-2 font-mono text-sm bg-surface p-4 rounded border border-yellow-100 dark:border-yellow-900/30">
 {recoveryCodes.map((code, i) => (
 <div key={i} className="text-text-secondary select-all p-1">
 {code}
 </div>
 ))}
 </div>
 <div className="mt-4 flex justify-end">
 <button
 onClick={() => {
 setSetupStep('idle');
 setShowRecoveryCodes(false);
 }}
 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 hover:underline"
 >
 I have saved them
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 <form onSubmit={handlePasswordChange} className="space-y-6 max-w-lg border-t border-border pt-8">
 <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Current Password
 </label>
 <input
 type="password"
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 New Password
 </label>
 <input
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Confirm New Password
 </label>
 <input
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className="w-full px-4 py-2 border border-border-strong rounded-lg bg-surface text-text-primary"
 required
 />
 </div>

 <div className="pt-4">
 <button
 type="submit"
 disabled={isLoading}
 className="btn-primary flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
 >
 <Save className="w-4 h-4" />
 Update Password
 </button>
 </div>
 </form>
 </div>
 )}

 {activeTab === 'preferences' && (
 <div className="space-y-8 max-w-lg">
 {/* Notifications */}
 <div>
 <h2 className="text-lg font-semibold text-text-primary mb-4">Notifications</h2>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-text-primary">Email Notifications</p>
 <p className="text-sm text-text-muted">Receive updates about your cases via email</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={notifications.email}
 onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-text-primary">SMS Notifications</p>
 <p className="text-sm text-text-muted">Receive urgent alerts via text message</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={notifications.sms}
 onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-strong after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>
 </div>
 </div>

 <div className="pt-4">
 <button
 onClick={handleSave}
 disabled={isLoading}
 className="btn-primary flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
 >
 <Save className="w-4 h-4" />
 Save Preferences
 </button>
 </div>
 </div>

 )}


 </div>
 </div>
 </main >
 </div >
 );
}
