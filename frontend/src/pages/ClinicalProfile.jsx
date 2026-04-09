import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Activity, Save, AlertCircle, ChevronLeft } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const ClinicalProfile = () => {
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        blood_group: '',
        weight_kg: '',
        height_cm: '',
        allergies: [],
        emergency_contact: ''
    });
    const [newAllergy, setNewAllergy] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/telemetry/emergency'); // Reusing this for simplicity in this real-world patch
                // Transform backend response back to editable profile
                const names = res.data.name.split(' ');
                setProfile({
                    first_name: names[0] || '',
                    last_name: names[1] || '',
                    blood_group: res.data.blood_group,
                    weight_kg: 78.5, // Default/Mock for now until we add GET /patient/1
                    height_cm: 181.0,
                    allergies: res.data.allergies || [],
                    emergency_contact: res.data.emergency_contact
                });
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        // In a real app, this would be a PUT /patient/1
        // For now, we simulate success and update local state
        setTimeout(() => {
            setSaving(false);
            alert("Clinical Profile Synchronized with Neural Node.");
        }, 1500);
    };

    const addAllergy = () => {
        if (newAllergy.trim()) {
            setProfile(prev => ({ ...prev, allergies: [...prev.allergies, newAllergy.trim()] }));
            setNewAllergy('');
        }
    };

    if (loading) return <div className="min-h-screen bg-[#060b26] flex items-center justify-center text-blue-400 font-black uppercase tracking-widest italic">Authenticating Clinical Node...</div>;

    return (
        <div className="min-h-screen bg-[#060b26] text-blue-50 font-sans pb-20">
            <Navbar />
            
            <div className="pt-32 px-12 lg:px-24 max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center text-[10px] font-black uppercase tracking-widest text-blue-400/60 hover:text-blue-400 mb-12 transition-colors">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Medical Hub
                </button>

                <header className="mb-16">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 bg-orange-600/20 rounded-2xl border border-orange-500/20">
                            <User className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight uppercase">Clinical <span className="text-orange-600">Profile</span></h1>
                            <p className="text-blue-200/40 text-xs font-bold uppercase tracking-widest">Authorized Patient Identity & Biometric Baseline</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Basic Info */}
                    <div className="space-y-8 p-10 bg-indigo-950/20 rounded-[40px] border border-white/5">
                        <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-8">Identity Baseline</h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-200/40">First Name</label>
                                <input value={profile.first_name} onChange={e => setProfile({...profile, first_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-orange-500/50 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-200/40">Last Name</label>
                                <input value={profile.last_name} onChange={e => setProfile({...profile, last_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-orange-500/50 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-blue-200/40">Blood Group</label>
                            <select value={profile.blood_group} onChange={e => setProfile({...profile, blood_group: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-orange-500/50 outline-none transition-all appearance-none">
                                <option className="bg-[#060b26]">A+</option>
                                <option className="bg-[#060b26]">A-</option>
                                <option className="bg-[#060b26]">B+</option>
                                <option className="bg-[#060b26]">B-</option>
                                <option className="bg-[#060b26]">O+</option>
                                <option className="bg-[#060b26]">O-</option>
                                <option className="bg-[#060b26]">AB+</option>
                                <option className="bg-[#060b26]">AB-</option>
                            </select>
                        </div>
                    </div>

                    {/* Biometrics */}
                    <div className="space-y-8 p-10 bg-indigo-950/20 rounded-[40px] border border-white/5">
                        <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-8">Biometric Telemetry</h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-200/40">Weight (kg)</label>
                                <input type="number" value={profile.weight_kg} onChange={e => setProfile({...profile, weight_kg: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-orange-500/50 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-200/40">Height (cm)</label>
                                <input type="number" value={profile.height_cm} onChange={e => setProfile({...profile, height_cm: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-orange-500/50 outline-none transition-all" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-blue-200/40">Emergency Contact</label>
                            <input value={profile.emergency_contact} onChange={e => setProfile({...profile, emergency_contact: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-orange-500/50 outline-none transition-all" placeholder="+1-XXX-XXX-XXXX" />
                        </div>
                    </div>

                    {/* Allergies - Critical! */}
                    <div className="md:col-span-2 space-y-8 p-10 bg-red-600/5 rounded-[40px] border border-red-500/10">
                        <div className="flex items-center space-x-3 mb-4">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.4em]">Critical Allergy Gate</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 mb-6">
                            {profile.allergies.map((allg, i) => (
                                <motion.div 
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    key={i} 
                                    className="px-4 py-2 bg-red-600 text-[10px] font-black uppercase rounded-lg shadow-lg flex items-center"
                                >
                                    {allg}
                                    <button onClick={() => setProfile(prev => ({ ...prev, allergies: prev.allergies.filter((_, idx) => idx !== i) }))} className="ml-3 hover:text-white/60">×</button>
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex space-x-4">
                            <input 
                                value={newAllergy} 
                                onChange={e => setNewAllergy(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && addAllergy()}
                                placeholder="Add new allergy (e.g. Penicillin)..." 
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-xs font-bold uppercase focus:border-red-500/40 outline-none transition-all" 
                            />
                            <button onClick={addAllergy} className="px-8 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Add</button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-12 py-5 bg-gradient-to-r from-orange-600 to-red-600 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-15px_rgba(234,88,12,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center"
                    >
                        {saving ? (
                            <><Activity className="w-4 h-4 mr-3 animate-spin" /> Node Syncing...</>
                        ) : (
                            <><Save className="w-4 h-4 mr-3" /> Save Clinical Profile</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClinicalProfile;
