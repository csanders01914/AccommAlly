'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    User,
    Mail,
    Phone,
    Calendar,
    Shield,
    FileText,
    ArrowLeft,
    Edit2,
    AlertCircle,
    CheckCircle,
    Clock,
    Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClaimantData {
    id: string;
    claimantNumber: string;
    name: string;
    birthdate: string;
    email: string | null;
    phone: string | null;
    credentialType: 'PIN' | 'PASSPHRASE';
    createdAt: string;
    cases: {
        id: string;
        caseNumber: string;
        title: string;
        description: string | null;
        status: string;
        program: string | null;
        createdAt: string;
        claimFamily?: { id: string; name: string | null } | null;
    }[];
}

interface CurrentUser {
    role: string;
}

export default function ClaimantProfilePage() {
    const params = useParams();
    const router = useRouter();
    const claimantId = params.id as string;

    const [claimant, setClaimant] = useState<ClaimantData | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch current user
                const userRes = await fetch('/api/me');
                if (userRes.ok) {
                    setCurrentUser(await userRes.json());
                }

                // Fetch claimant data
                const res = await fetch(`/api/claimants/${claimantId}`);
                if (!res.ok) {
                    throw new Error('Claimant not found');
                }
                const data = await res.json();
                setClaimant(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load claimant');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [claimantId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'REVIEW':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'CLOSED':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
            default:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const isAdmin = currentUser?.role === 'ADMIN';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !claimant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
                <p className="text-lg font-medium">{error || 'Claimant not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                        <User className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {claimant.name}
                                        </h1>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span className="font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                                                ID: {claimant.claimantNumber}
                                            </span>
                                            <span>•</span>
                                            <span>{claimant.cases.length} case(s)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                                <Edit2 className="w-4 h-4" />
                                Edit Claimant
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Contact Info Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Contact Information
                            </h2>
                            <div className="space-y-4">
                                {claimant.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {claimant.email}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {claimant.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                            <Phone className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Phone</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {claimant.phone}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Date of Birth</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatDate(claimant.birthdate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Verification Method</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {claimant.credentialType === 'PIN' ? 'PIN (4-6 digits)' : 'Passphrase'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs text-gray-500">
                                    Claimant since {formatDate(claimant.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cases List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Cases ({claimant.cases.length})
                            </h2>

                            {claimant.cases.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No cases found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {claimant.cases.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => router.push(`/cases/${c.id}`)}
                                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                                                            {c.caseNumber}
                                                        </span>
                                                        <span className={cn(
                                                            "px-2 py-0.5 text-xs font-medium rounded-full",
                                                            getStatusColor(c.status)
                                                        )}>
                                                            {c.status}
                                                        </span>
                                                        {c.claimFamily && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                                <LinkIcon className="w-3 h-3" />
                                                                {c.claimFamily.name || 'Family'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                                        {c.title}
                                                    </h3>
                                                    {c.description && (
                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                            {c.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-gray-500 ml-4">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(c.createdAt)}
                                                    </div>
                                                    {c.program && (
                                                        <div className="mt-1">{c.program}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
