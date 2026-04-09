import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Activity, Database, Zap } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-indigo-950/90 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-3">
                {/* Brand */}
                <div onClick={() => navigate('/')} className="flex items-center space-x-3 cursor-pointer group">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-all shadow-lg border border-orange-500/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        MedFusion<span className="text-orange-600">AI</span>
                    </h1>
                </div>

                {/* Nav Links */}
                <div className="hidden md:flex items-center space-x-10">
                    {[
                        { name: 'Home', path: '/', icon: Layout },
                        { name: 'Upload', path: '/ingestion', icon: Activity },
                        { name: 'History', path: '/archive', icon: Database }
                    ].map(link => (
                        <button
                            key={link.path}
                            onClick={() => navigate(link.path)}
                            className="flex items-center space-x-2 text-[10px] font-bold text-slate-200 hover:text-orange-500 uppercase tracking-widest transition-all relative group"
                        >
                            <link.icon className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                            <span>{link.name}</span>
                            <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-orange-600 transition-all group-hover:w-full" />
                        </button>
                    ))}
                </div>

                <div className="w-20 hidden md:block" /> {/* Spacer for symmetry */}
            </div>
        </nav>
    );
};

export default Navbar;
