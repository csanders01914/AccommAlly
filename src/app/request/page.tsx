'use client';

import { useState } from 'react';
import { Shield, Send, CheckCircle, Upload, User, Mail, Phone, Building2, Calendar, FileText, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists, else use template literals

type AccommodationType = 'equipment' | 'schedule' | 'remote' | 'assistive' | 'medical' | 'other';
type ContactMethod = 'phone' | 'email' | 'either';

interface FormData {
    fullName: string;
    email: string;
    phone: string;
    birthdate: string;
    preferredContact: ContactMethod;
    accommodationType: AccommodationType | '';
    description: string;
    reason: string;
    program: string;
    venue: string;
    preferredStartDate: string;
    supportingDocument: File | null;
    credentialType: 'PIN' | 'PASSPHRASE';
    credential: string;
}

const STEPS = [
    { number: 1, title: "Contact Information", icon: User },
    { number: 2, title: "Accommodation Needs", icon: FileText },
    { number: 3, title: "Additional Details", icon: Building2 },
    { number: 4, title: "Review & Submit", icon: CheckCircle }
];

export default function AccommodationRequestPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        phone: '',
        birthdate: '',
        preferredContact: 'either',
        accommodationType: '',
        description: '',
        reason: '',
        program: '',
        venue: '',
        preferredStartDate: '',
        supportingDocument: null,
        credentialType: 'PIN',
        credential: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [claimNumber, setClaimNumber] = useState<string>('');
    const [claimantNumber, setClaimantNumber] = useState<string>('');
    const [isNewClaimant, setIsNewClaimant] = useState<boolean>(true);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 4));
            window.scrollTo(0, 0);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo(0, 0);
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Partial<Record<keyof FormData, string>> = {};

        if (step === 1) {
            if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
            if (!formData.email.trim()) newErrors.email = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
            if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
            if (!formData.birthdate) newErrors.birthdate = 'Date of birth is required';

            // Validate credential
            if (!formData.credential.trim()) {
                newErrors.credential = formData.credentialType === 'PIN' ? 'PIN is required' : 'Passphrase is required';
            } else if (formData.credentialType === 'PIN') {
                if (!/^\d{4,6}$/.test(formData.credential)) {
                    newErrors.credential = 'PIN must be 4-6 digits';
                }
            } else {
                if (formData.credential.length < 12 || formData.credential.length > 65) {
                    newErrors.credential = 'Passphrase must be 12-65 characters';
                }
            }
        }

        if (step === 2) {
            if (!formData.accommodationType) newErrors.accommodationType = 'Accommodation type is required';
            if (!formData.description.trim()) newErrors.description = 'Description is required';
            else if (formData.description.length < 20) newErrors.description = 'Please provide more detail (20+ chars)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== '') {
                    if (value instanceof File) {
                        submitData.append(key, value);
                    } else {
                        submitData.append(key, String(value));
                    }
                }
            });

            const response = await fetch('/api/cases', {
                method: 'POST',
                body: submitData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error === 'Validation Error'
                    ? errorData.details?.map((d: any) => d.message).join(', ')
                    : (errorData.error || 'Submission failed');
                throw new Error(errorMessage || 'Something went wrong. Please check your inputs.');
            }

            const data = await response.json();
            setClaimNumber(data.caseNumber);
            setClaimantNumber(data.claimantNumber || '');
            setIsNewClaimant(data.isNewClaimant !== false);
            setIsSubmitted(true);
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Steps...
    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Let's start with your contact details</h2>
                    <div className="space-y-4">
                        <Input label="Full Name" name="fullName" value={formData.fullName} error={errors.fullName} onChange={handleChange} required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Email" name="email" type="email" value={formData.email} error={errors.email} onChange={handleChange} required icon={<Mail className="w-4 h-4 text-gray-400" />} />
                            <Input
                                label="Phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                error={errors.phone}
                                onChange={handleChange}
                                required
                                placeholder="(555) 555-5555"
                                maxLength={14}
                                icon={<Phone className="w-4 h-4 text-gray-400" />}
                            />
                        </div>
                        <Input
                            label="Date of Birth"
                            name="birthdate"
                            type="date"
                            value={formData.birthdate}
                            error={errors.birthdate}
                            onChange={handleChange}
                            required
                            icon={<Calendar className="w-4 h-4 text-gray-400" />}
                        />
                        <Select label="Preferred Contact" name="preferredContact" value={formData.preferredContact} onChange={handleChange} options={[
                            { value: 'either', label: 'Either' }, { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }
                        ]} />

                        {/* PIN/Passphrase Section */}
                        <div className="pt-4 border-t border-white/10">
                            <h3 className="text-lg font-medium text-white mb-3">Identity Verification Setup</h3>
                            <p className="text-blue-200/70 text-sm mb-4">
                                Create a PIN or passphrase to verify your identity when calling about your claim.
                            </p>

                            <div className="flex gap-4 mb-4">
                                <label className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all",
                                    formData.credentialType === 'PIN'
                                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                                        : "border-white/20 text-white/60 hover:bg-white/5"
                                )}>
                                    <input
                                        type="radio"
                                        name="credentialType"
                                        value="PIN"
                                        checked={formData.credentialType === 'PIN'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <Shield className="w-4 h-4" />
                                    PIN (4-6 digits)
                                </label>
                                <label className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all",
                                    formData.credentialType === 'PASSPHRASE'
                                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                                        : "border-white/20 text-white/60 hover:bg-white/5"
                                )}>
                                    <input
                                        type="radio"
                                        name="credentialType"
                                        value="PASSPHRASE"
                                        checked={formData.credentialType === 'PASSPHRASE'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <FileText className="w-4 h-4" />
                                    Passphrase
                                </label>
                            </div>

                            {formData.credentialType === 'PIN' ? (
                                <Input
                                    label="Your PIN"
                                    name="credential"
                                    type="password"
                                    value={formData.credential}
                                    error={errors.credential}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter 4-6 digit PIN"
                                    maxLength={6}
                                    icon={<Shield className="w-4 h-4 text-gray-400" />}
                                />
                            ) : (
                                <Input
                                    label="Your Passphrase"
                                    name="credential"
                                    type="password"
                                    value={formData.credential}
                                    error={errors.credential}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter 12-65 character passphrase"
                                    maxLength={65}
                                    icon={<Shield className="w-4 h-4 text-gray-400" />}
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
            case 2: return (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Describe your accommodation needs</h2>
                    <Select label="Type of Accommodation" name="accommodationType" value={formData.accommodationType} error={errors.accommodationType} onChange={handleChange} required options={[
                        { value: 'equipment', label: 'Equipment Modification' },
                        { value: 'schedule', label: 'Schedule Modification' },
                        { value: 'remote', label: 'Remote Work' },
                        { value: 'assistive', label: 'Assistive Tech' },
                        { value: 'medical', label: 'Medical Leave' },
                        { value: 'other', label: 'Other' }
                    ]} />
                    <TextArea label="Description" name="description" value={formData.description} error={errors.description} onChange={handleChange} required />
                    <TextArea label="Reason / Medical Condition (Optional)" name="reason" value={formData.reason} onChange={handleChange} />
                </div>
            );
            case 3: return (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Additional Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Program (Optional)" name="program" value={formData.program} onChange={handleChange} />
                        <Input label="Venue (Optional)" name="venue" value={formData.venue} onChange={handleChange} />
                    </div>
                    <Input label="Preferred Start Date (Optional)" name="preferredStartDate" type="date" value={formData.preferredStartDate} onChange={handleChange} />

                    <div className="pt-4">
                        <label className="block text-sm font-medium text-blue-100 mb-2">Supporting Documents</label>
                        <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 transition-all cursor-pointer relative">
                            <input
                                type="file"
                                onChange={handleFile}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                aria-label="Upload supporting documents"
                            />
                            <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" aria-hidden="true" />
                            <p className="text-blue-100">{formData.supportingDocument ? formData.supportingDocument.name : "Click to upload file"}</p>
                            <p className="text-blue-300/50 text-xs mt-1">PDF, DOC, JPG (Max 10MB)</p>
                        </div>
                    </div>
                </div>
            );
            case 4: return (
                <div className="space-y-6 text-white">
                    <h2 className="text-xl font-semibold mb-4">Review your request</h2>
                    <div className="bg-white/10 rounded-xl p-6 space-y-4">
                        <ReviewRow label="Name" value={formData.fullName} />
                        <ReviewRow label="Email" value={formData.email} />
                        <ReviewRow label="Phone" value={formData.phone} />
                        <ReviewRow label="Date of Birth" value={formData.birthdate} />
                        <ReviewRow label="Type" value={formData.accommodationType} />
                        <ReviewRow label="Description" value={formData.description} />
                        <ReviewRow label="Document" value={formData.supportingDocument?.name || 'None'} />
                        <ReviewRow label="Verification" value={formData.credentialType === 'PIN' ? 'PIN Set' : 'Passphrase Set'} />
                    </div>
                    <p className="text-blue-200/70 text-sm">By submitting, you acknowledge that this information is accurate.</p>
                </div>
            );
        }
    };

    const formatPhone = (val: string) => {
        if (!val) return val;
        const phoneNumber = val.replace(/[^\d]/g, "");
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        let { name, value } = e.target;

        if (name === 'phone') value = formatPhone(value);

        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof FormData]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFormData(prev => ({ ...prev, supportingDocument: files[0] }));
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Request Submitted!</h1>

                    <div className="space-y-4 mb-6">
                        <div>
                            <p className="text-blue-200 text-sm">Claim Number</p>
                            <div className="bg-white/20 rounded-lg p-3">
                                <code className="text-xl font-bold text-white tracking-widest">{claimNumber}</code>
                            </div>
                        </div>

                        {claimantNumber && (
                            <div>
                                <p className="text-blue-200 text-sm">Claimant ID</p>
                                <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                                    <code className="text-xl font-bold text-blue-400 tracking-widest">{claimantNumber}</code>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 text-left">
                        <p className="text-sm text-blue-200/90">
                            {isNewClaimant ? (
                                <><strong>Important:</strong> Save your Claimant ID and PIN/passphrase. You\'ll need them to verify your identity when calling about your claim.</>
                            ) : (
                                <>Your case has been linked to your existing Claimant ID. Use your previously set PIN/passphrase for verification.</>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="inline-flex p-3 rounded-2xl bg-blue-600/30 mb-4 ring-1 ring-blue-500/50">
                        <Shield className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">AccommAlly</h1>
                    <p className="text-blue-200">Accommodation Request Service</p>
                </div>

                {/* Progress Steps */}
                <nav aria-label="Progress" className="flex justify-between mb-8 relative px-4">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -z-10" />
                    {STEPS.map((s) => (
                        <div
                            key={s.number}
                            className={cn("flex flex-col items-center gap-2 relative z-10", currentStep >= s.number ? "text-blue-400" : "text-gray-500")}
                            aria-current={currentStep === s.number ? 'step' : undefined}
                        >
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors bg-slate-900",
                                currentStep >= s.number ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-white/10 text-gray-500")}>
                                <s.icon className="w-5 h-5" aria-hidden="true" />
                            </div>
                            <span className="text-xs font-medium hidden sm:block">{s.title}</span>
                        </div>
                    ))}
                </nav>

                {/* Form Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-8 border-t border-white/10">
                        {currentStep > 1 ? (
                            <button onClick={handleBack} className="flex items-center gap-2 px-6 py-2.5 rounded-xl hover:bg-white/5 text-white transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        ) : <div />}

                        {currentStep < 4 ? (
                            <button onClick={handleNext} className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20">
                                Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-8 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50">
                                {isSubmitting ? 'Submitting...' : 'Submit Request'} <Send className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
import { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    icon?: React.ReactNode;
}

function Input({ label, error, icon, ...props }: InputProps) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-blue-100 mb-1.5">{label} {props.required && <span className="text-red-400">*</span>}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">{icon}</div>}
                <input
                    id={id}
                    className={cn("w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-blue-200/50",
                        error ? "border-red-500" : "border-white/20",
                        icon && "pl-10"
                    )}
                    aria-invalid={!!error}
                    {...props}
                />
            </div>
            {error && <p className="text-red-400 text-sm mt-1 flex items-center gap-1" role="alert"><AlertCircle className="w-3 h-3" /> {error}</p>}
        </div>
    );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
}

function TextArea({ label, error, ...props }: TextAreaProps) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-blue-100 mb-1.5">{label} {props.required && <span className="text-red-400">*</span>}</label>
            <textarea
                id={id}
                rows={4}
                className={cn("w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none placeholder:text-blue-200/50",
                    error ? "border-red-500" : "border-white/20"
                )}
                aria-invalid={!!error}
                {...props}
            />
            {error && <p className="text-red-400 text-sm mt-1 flex items-center gap-1" role="alert"><AlertCircle className="w-3 h-3" /> {error}</p>}
        </div>
    );
}

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: SelectOption[];
    error?: string;
}

function Select({ label, options, error, ...props }: SelectProps) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-blue-100 mb-1.5">{label} {props.required && <span className="text-red-400">*</span>}</label>
            <select
                id={id}
                className={cn("w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer",
                    error ? "border-red-500" : "border-white/20"
                )}
                aria-invalid={!!error}
                {...props}
            >
                <option value="" className="bg-slate-900">Select...</option>
                {options.map((o) => <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>)}
            </select>
            {error && <p className="text-red-400 text-sm mt-1 flex items-center gap-1" role="alert"><AlertCircle className="w-3 h-3" /> {error}</p>}
        </div>
    );
}

interface ReviewRowProps {
    label: string;
    value: string | number | undefined | null;
}

function ReviewRow({ label, value }: ReviewRowProps) {
    return (
        <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-blue-200/80 text-sm">{label}</span>
            <span className="text-white font-medium text-right">{value || '-'}</span>
        </div>
    );
}

