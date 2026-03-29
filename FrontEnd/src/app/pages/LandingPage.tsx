import React, { useState, useEffect } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import {
    Leaf, BarChart3, Users, Package, DollarSign, ArrowRight,
    Search, Bell, User as UserIcon, CloudRain, Thermometer, Droplets, Plus, Zap, CheckCircle2, 
    MapPin, Globe, Shield, Sparkles, Scan, Star, Quote, Facebook, Twitter, Instagram, Linkedin, Send, Mail, MessageSquare
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export function LandingPage() {
    const { openSignIn } = useClerk();
    const { isSignedIn, user } = useUser();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (isSignedIn) {
        const userRole = (user?.publicMetadata?.role as 'owner' | 'clerk' | 'worker') || 'worker';
        return <Navigate to={userRole === 'worker' ? '/worker-dashboard' : '/dashboard'} replace />;
    }

    const handleLogin = () => {
        openSignIn({
            afterSignInUrl: '/dashboard',
            afterSignUpUrl: '/settings',
        });
    };

    return (
        <div className="min-h-screen bg-[#D7E4DC] font-sans text-gray-900 p-4 md:p-8">
            {/* Main Content Container mirroring the inner rounded card of the reference */}
            <div className="max-w-[1600px] mx-auto bg-[#E8F0E9] rounded-[2.5rem] md:rounded-[4rem] min-h-[calc(100vh-4rem)] relative overflow-hidden shadow-2xl border border-white/40">

                <PublicNavbar />

                {/* Hero / Landing Page Content */}
                <div className="relative pt-32 md:pt-48 pb-12 px-6 md:px-12 lg:px-20">

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

                        {/* LEFT COLUMN: Hero Copy */}
                        <div className="lg:col-span-6 xl:col-span-6 flex flex-col items-start text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-wider mb-8 shadow-xl">
                                <Sparkles className="w-3 h-3 text-[#C8FF4C]" />
                                AI-Driven Plantation Excellence
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-[#1A1A1A] leading-[1.05] tracking-tight mb-8">
                                Harvesting <br />
                                <span className="text-[#888888]">the Future.</span>
                            </h1>

                            <p className="text-lg md:text-xl text-gray-600 max-w-xl mb-12 leading-relaxed">
                                The intelligent platform for the modern Ceylon Tea industry.
                                Master your yields, empower your workers, and monitor every
                                leaf with surgical precision from a single digital cockpit.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                <button onClick={handleLogin} className="w-full sm:w-auto px-10 py-5 bg-black text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl">
                                    Launch Your Estate <ArrowRight className="w-5 h-5" />
                                </button>
                                <button className="w-full sm:w-auto px-10 py-5 bg-white text-black border border-black/5 rounded-full font-bold text-lg hover:bg-white/60 transition-colors">
                                    Watch Demo
                                </button>
                            </div>

                            {/* Trust Badges */}
                            <div className="mt-16 flex items-center gap-8 grayscale opacity-50">
                                <div className="flex items-center gap-2 font-bold text-sm tracking-tighter">
                                    <Globe className="w-5 h-5" /> GLOBAL STANDARDS
                                </div>
                                <div className="flex items-center gap-2 font-bold text-sm tracking-tighter">
                                    <Shield className="w-5 h-5" /> SECURE DATA
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Visual Map Showcase */}
                        <div className="lg:col-span-6 xl:col-span-6">
                            <div className="relative group">
                                <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white h-[400px] md:h-[600px] relative transform lg:rotate-2 group-hover:rotate-0 transition-all duration-700">
                                    <img
                                        src="/DSC58651.jpg"
                                        className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                                        alt="Intelligent Estate Map"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                </div>

                                {/* Floating Small Card behind main image */}
                                <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#C8FF4C] rounded-[2.5rem] opacity-20 -z-10 group-hover:scale-125 transition-transform duration-700"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stunning Feature Bento Grid */}
                <div className="px-6 md:px-12 lg:px-20 pb-32">
                    <div className="mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/40 shadow-sm hover:scale-105 transition-transform cursor-default">
                            <Zap className="w-4 h-4 text-black fill-[#C8FF4C]" /> Everything You Need
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                            The complete <br /> <span className="text-gray-400">plantation OS.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Bento Item 1: Wide AI Scanner (Span 2) */}
                        <div className="md:col-span-2 bg-[#1A1A1A] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-[#C8FF4C]/10 to-transparent pointer-events-none group-hover:from-[#C8FF4C]/20 transition-all duration-700"></div>
                            <div className="relative z-10 w-full md:w-2/3">
                                <Search className="w-10 h-10 text-[#C8FF4C] mb-8 group-hover:scale-110 transition-transform duration-500" />
                                <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4">Neural Vision Diagnosis</h3>
                                <p className="text-gray-400 leading-relaxed text-lg">
                                    Instantly detect leaf diseases and nutrient deficiencies with computer vision. 
                                    Protect yields by acting on AI-powered early alerts before spreads occur.
                                </p>
                            </div>
                            {/* Decorative element */}
                            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform duration-700">
                                <Scan className="w-24 h-24 text-white/20" />
                            </div>
                        </div>

                        {/* Bento Item 2: Square Harvest */}
                        <div className="bg-[#C8FF4C] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group shadow-lg hover:shadow-[#C8FF4C]/40 transition-shadow duration-500">
                            <Leaf className="w-10 h-10 text-black mb-8 group-hover:rotate-12 transition-transform duration-500" />
                            <h3 className="text-2xl lg:text-3xl font-bold text-black mb-4 leading-tight">Precision<br/>Yield Tracking</h3>
                            <p className="text-black/80 font-medium">
                                Link daily harvests directly to workers and plots—eliminating human error from payouts instantly.
                            </p>
                            <div className="absolute -bottom-8 -right-8 opacity-[0.15] group-hover:scale-125 transition-transform duration-700">
                                <BarChart3 className="w-40 h-40 text-black" />
                            </div>
                        </div>

                        {/* Bento Item 3: Square Workforce */}
                        <div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 md:p-12 group shadow-sm hover:shadow-xl transition-all duration-500">
                            <Users className="w-10 h-10 text-blue-600 mb-8 group-hover:-translate-y-2 transition-transform duration-500" />
                            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-tight">Smart<br/>Workforce</h3>
                            <p className="text-gray-600 font-medium">
                                One-touch attendance, dynamic real-time shifts, and automated payroll tailored for massive estates.
                            </p>
                        </div>

                        {/* Bento Item 4: Wide Inventory Analytics (Span 2) */}
                        <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500">
                            <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
                                <div className="flex-1">
                                    <Package className="w-10 h-10 text-gray-900 mb-8 group-hover:translate-x-2 transition-transform duration-500" />
                                    <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Intelligent Inventory</h3>
                                    <p className="text-gray-600 leading-relaxed text-lg">
                                        Total oversight over fertilizers, equipment, and resources. 
                                        Set automated threshold alerts so your plantation never halts production.
                                    </p>
                                </div>
                                <div className="w-full md:w-1/3 flex items-center justify-center mt-6 md:mt-0">
                                    {/* Spinner abstract animation */}
                                    <div className="w-32 h-32 rounded-full border-8 border-gray-100 group-hover:border-[#1A1A1A] group-hover:border-t-[#C8FF4C] flex items-center justify-center transition-all duration-1000 shadow-xl relative">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                                            <Shield className="w-6 h-6 text-gray-400 group-hover:text-green-500 transition-colors duration-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Abstract background blobs */}
                            <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-y-1/2 pointer-events-none"></div>
                        </div>

                    </div>
                </div>

                {/* 1. Testimonials Section */}
                <div className="mt-32 px-6 md:px-12 lg:px-20 mb-32">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/40 shadow-sm cursor-default hover:scale-105 transition-transform">
                            <Quote className="w-4 h-4 text-[#C8FF4C] fill-[#C8FF4C]/50" /> Voice of the Planter
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                            Trusted by top <br /> <span className="text-gray-400">estate managers.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                        {/* Testimonial 1 */}
                        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 relative group hover:-translate-y-2 transition-transform duration-500">
                            <div className="flex items-center gap-1 mb-6 text-[#C8FF4C]">
                                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                            </div>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8 relative z-10">
                                "TeaPlanter AI completely transformed how we handle our logistics. The disease scanner alone saved 20% of our seasonal yield."
                            </p>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">RC</div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Ravi Chandran</h4>
                                    <p className="text-sm text-gray-500">Estate Manager, Nuwara Eliya</p>
                                </div>
                            </div>
                            <div className="absolute top-8 right-8 text-gray-100 group-hover:text-gray-200 transition-colors duration-500">
                                <Quote className="w-16 h-16 opacity-50" />
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="bg-[#1A1A1A] rounded-[2rem] p-8 shadow-2xl border border-white/5 relative group hover:-translate-y-2 transition-transform duration-500">
                            <div className="flex items-center gap-1 mb-6 text-[#C8FF4C]">
                                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                            </div>
                            <p className="text-gray-300 text-lg leading-relaxed mb-8 relative z-10">
                                "The intelligent inventory forecasting meant we never ran out of fertilizer during the peak season. It’s a game changer."
                            </p>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center font-bold text-white">SP</div>
                                <div>
                                    <h4 className="font-bold text-white">Sunil Perera</h4>
                                    <p className="text-sm text-gray-500">Operations Lead, Kandy Estates</p>
                                </div>
                            </div>
                            <div className="absolute top-8 right-8 text-white/5 group-hover:text-white/10 transition-colors duration-500">
                                <Quote className="w-16 h-16 opacity-50" />
                            </div>
                        </div>

                        {/* Testimonial 3 */}
                        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-8 shadow-md border border-white/60 relative group hover:-translate-y-2 transition-transform duration-500">
                            <div className="flex items-center gap-1 mb-6 text-[#C8FF4C]">
                                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                            </div>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8 relative z-10">
                                "Tying daily harvest weights directly to worker payroll automatically is incredible. No more manual ledger counting."
                            </p>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">AK</div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Anura Kumara</h4>
                                    <p className="text-sm text-gray-500">Director, Central Highlands</p>
                                </div>
                            </div>
                            <div className="absolute top-8 right-8 text-green-50 group-hover:text-green-100 transition-colors duration-500">
                                <Quote className="w-16 h-16 opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Big CTA Banner */}
                <div className="px-6 md:px-12 lg:px-20 mb-32">
                    <div className="relative bg-[#C8FF4C] rounded-[3rem] p-12 lg:p-20 overflow-hidden shadow-2xl flex flex-col items-center text-center group border border-[#b2e83e]">
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/40 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none"></div>
                        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-black/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none"></div>
                        
                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-black mb-8 leading-[1.05]">
                                Ready to scale your plantation?
                            </h2>
                            <p className="text-xl text-black/70 mb-12 font-medium">
                                Join dozens of modern estates leveraging AI to optimize every leaf. Start your journey with TeaPlanter AI today.
                            </p>
                            <button onClick={handleLogin} className="px-10 py-5 bg-black text-white rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-2xl mx-auto">
                                Start Your Estate Now <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Decorative floating icon */}
                        <div className="absolute top-12 right-12 md:top-20 md:right-20 animate-[spin_10s_linear_infinite] opacity-50 hidden md:block">
                            <Sparkles className="w-16 h-16 text-black/20" />
                        </div>
                    </div>
                </div>

                <PublicFooter />
            </div>
        </div>
    );
}
