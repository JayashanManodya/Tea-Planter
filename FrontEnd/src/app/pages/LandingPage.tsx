import React, { useState, useEffect } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import {
    Leaf, BarChart3, Users, Package, DollarSign, ArrowRight,
    Search, Bell, User as UserIcon, CloudRain, Thermometer,
    Droplets, Plus, Zap, CheckCircle2, MapPin, Globe, Shield, Sparkles
} from 'lucide-react';

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

                {/* Floating Pill Navigation */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-[90%] md:auto">
                    <nav className="bg-black/90 backdrop-blur-xl rounded-full px-4 py-2 flex items-center justify-between md:gap-8 shadow-2xl border border-white/10">
                        {/* Logo Pill */}
                        <div className="flex items-center gap-2 group cursor-pointer pr-4 md:pr-0 border-r border-white/20 md:border-0 pl-2">
                            <div className="p-1.5 bg-[#C8FF4C] rounded-full">
                                <Leaf className="w-4 h-4 text-black" />
                            </div>
                            <span className="text-white font-bold hidden sm:inline">TeaPlanter AI</span>
                        </div>

                        {/* Nav Items */}
                        <div className="hidden lg:flex items-center gap-6">
                            {['Features', 'Solutions', 'Estate Map', 'Pricing'].map(item => (
                                <span key={item} className="text-white/70 text-xs font-medium hover:text-white transition-colors cursor-pointer">{item}</span>
                            ))}
                        </div>

                        {/* Action Icons */}
                        <div className="flex items-center gap-3 pr-2">
                            <button onClick={handleLogin} className="hidden sm:flex items-center gap-2 text-white/70 text-xs font-bold hover:text-white mr-2">
                                For Planters
                            </button>
                            <button onClick={handleLogin} className="px-6 py-2 bg-[#C8FF4C] rounded-full text-black text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-lime-500/20">
                                Get Started
                            </button>
                        </div>
                    </nav>
                </div>

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

                                    {/* Map Pins Overlays */}
                                    <div className="absolute top-[30%] left-[40%] animate-bounce">
                                        <div className="p-2 bg-[#C8FF4C] rounded-full shadow-2xl border-4 border-white">
                                            <Leaf className="w-4 h-4 text-black" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-[20%] right-[30%] animate-pulse">
                                        <div className="p-2 bg-white rounded-full shadow-2xl">
                                            <Users className="w-4 h-4 text-blue-600" />
                                        </div>
                                    </div>

                                    <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                                        <div className="p-5 bg-black/90 backdrop-blur rounded-[2rem] border border-white/20 shadow-2xl max-w-[240px]">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="h-2 w-2 rounded-full bg-[#C8FF4C] animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Live Monitoring</span>
                                            </div>
                                            <p className="text-white font-bold mb-1">Estate Yield View</p>
                                            <p className="text-white/60 text-xs leading-relaxed">Real-time satellite and on-ground data integration.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating Small Card behind main image */}
                                <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#C8FF4C] rounded-[2.5rem] opacity-20 -z-10 group-hover:scale-125 transition-transform duration-700"></div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* SECTION: THE AI CORE (Cornerstone Features) */}
                <div className="mt-40 mb-20 text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-[#C8FF4C]/5 to-transparent -z-10 blur-3xl"></div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-wider mb-8 shadow-xl">
                        <Sparkles className="w-3 h-3 text-[#C8FF4C]" />
                        Neural Intelligence Layer
                    </div>
                    <h2 className="text-4xl md:text-7xl font-bold mb-16 tracking-tight">The <span className="text-[#888888]">AI Core.</span></h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">

                        {/* AI FEATURE 1: DISEASE DETECTION */}
                        <div className="bg-[#111111] rounded-[4rem] p-10 relative overflow-hidden group border border-white/5">
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-10 border border-white/10 group-hover:bg-[#C8FF4C] group-hover:scale-110 transition-all duration-500">
                                    <Search className="w-6 h-6 text-[#C8FF4C] group-hover:text-black" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Tea Leaf Disease <br />Detection</h3>
                                <p className="text-white/40 text-sm leading-relaxed mb-8">
                                    Utilizes deep **CNN (Convolutional Neural Networks)** to identify pathologies
                                    with 98% accuracy. Early diagnosis saves 30% of average crop loss.
                                </p>
                                <div className="flex items-center gap-3 text-[10px] font-black text-[#C8FF4C] uppercase tracking-widest bg-white/5 w-fit px-4 py-2 rounded-full border border-white/10">
                                    Architecture: CNN
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#C8FF4C]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute top-12 right-12 text-white/5 text-[5rem] font-bold select-none leading-none">01</div>
                        </div>

                        {/* AI FEATURE 2: PRICE PREDICTION */}
                        <div className="bg-white rounded-[4rem] p-10 relative overflow-hidden group border border-black/5 shadow-sm hover:shadow-2xl transition-all duration-500">
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:rotate-6">
                                    <BarChart3 className="w-6 h-6 text-[#C8FF4C]" />
                                </div>
                                <h3 className="text-2xl font-bold text-black mb-4">Market Price <br />Forecasting</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                                    Advanced **Machine Learning Time-Series** models analyze global
                                    demand to forecast future valuation. Timing is everything in tea sales.
                                </p>
                                <div className="flex items-center gap-3 text-[10px] font-black text-black/40 uppercase tracking-widest bg-black/5 w-fit px-4 py-2 rounded-full border border-black/5">
                                    Model: ML Time-Series
                                </div>
                            </div>
                            <div className="absolute top-12 right-12 text-black/5 text-[5rem] font-bold select-none leading-none">02</div>
                        </div>

                        {/* AI FEATURE 3: AGENTIC CHATBOT */}
                        <div className="bg-[#111111] rounded-[4rem] p-10 relative overflow-hidden group border border-white/5">
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-[#C8FF4C] rounded-2xl flex items-center justify-center mb-10 group-hover:shadow-[0_0_30px_rgba(200,255,76,0.3)] transition-all">
                                    <Zap className="w-6 h-6 text-black" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Multi-Agentic <br />Estate Assistant</h3>
                                <p className="text-white/40 text-sm leading-relaxed mb-8">
                                    A sophisticated **Multi-Agent RAG** system that simulates expert advice
                                    by analyzing your unique plantation data and local climate constraints.
                                </p>
                                <div className="flex items-center gap-3 text-[10px] font-black text-[#C8FF4C] uppercase tracking-widest bg-white/5 w-fit px-4 py-2 rounded-full border border-white/10">
                                    System: Multi-Agent RAG
                                </div>
                            </div>
                            <div className="absolute top-12 right-12 text-white/5 text-[5rem] font-bold select-none leading-none">03</div>
                        </div>

                    </div>
                </div>

                {/* SECTION: HARVEST INTELLIGENCE (Actual Feature: Harvest weights/linking) */}
                <div className="mt-40 bg-white rounded-[4rem] p-12 md:p-20 relative overflow-hidden shadow-sm border border-black/5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C8FF4C]/20 text-black text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
                                <Sparkles className="w-3 h-3" /> Precision Weight System
                            </div>
                            <h2 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">Master Every <br /><span className="text-gray-400 font-medium">Harvest Weight.</span></h2>
                            <p className="text-gray-600 text-lg mb-10 leading-relaxed">
                                Our integrated harvesting module logs every kilogram with precision.
                                Link harvests directly to workers and factories, ensuring
                                complete accountability and error-free payment calculation.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Real-time weight recording per worker',
                                    'Automatic link to factory delivery registries',
                                    'Historical yield analysis by plantation block'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold opacity-80">
                                        <div className="w-5 h-5 rounded-full bg-[#C8FF4C] flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="bg-[#1A1A1A] rounded-[3rem] p-8 aspect-video flex flex-col justify-end shadow-2xl overflow-hidden group border border-white/5">
                                {/* Real Data Visual Representation */}
                                <div className="absolute inset-x-8 top-8 grid grid-cols-3 gap-4">
                                    <div className="h-2 bg-[#C8FF4C] rounded-full w-full"></div>
                                    <div className="h-2 bg-white/20 rounded-full w-[60%]"></div>
                                    <div className="h-2 bg-white/20 rounded-full w-full"></div>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-white font-bold text-2xl">Today's Intake</span>
                                        <span className="bg-[#C8FF4C] text-black px-3 py-1 rounded-full text-[10px] font-black">SYNCED</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                                            <p className="text-white/40 text-[10px] font-bold uppercase mb-1">Total Weight</p>
                                            <p className="text-white text-xl font-black">2,840.5 KG</p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
                                            <p className="text-white/40 text-[10px] font-bold uppercase mb-1">Active Workers</p>
                                            <p className="text-white text-xl font-black">42</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#C8FF4C] rounded-full blur-3xl opacity-20 -z-10"></div>
                        </div>
                    </div>
                </div>



                {/* Features Grid Segment (Actual Features: AI Scanner, Inventory, Workforce) */}
                <div className="mt-40 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* FEATURE: AI Disease Scanner */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[3rem] p-10 border border-white/60 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-0 transition-transform">
                            <Search className="w-8 h-8 text-[#C8FF4C]" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">AI-Powered<br />Disease Scanner</h3>
                        <p className="text-gray-600 leading-relaxed mb-8">Utilize computer vision to identify tea leaf diseases instantly. Protect your plantation with early detection alerts.</p>
                        <div className="flex items-center gap-3 text-xs font-bold text-black/40 uppercase tracking-widest border-t border-black/5 pt-6">
                            <Sparkles className="w-4 h-4" /> Neural Vision Tech
                        </div>
                    </div>

                    {/* FEATURE: Inventory Integrity */}
                    <div className="bg-white/40 backdrop-blur-md rounded-[3rem] p-10 border border-white/60 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <div className="w-16 h-16 bg-[#C8FF4C] rounded-3xl flex items-center justify-center mb-8 -rotate-3 group-hover:rotate-0 transition-transform">
                            <Package className="w-8 h-8 text-black" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Inventory &<br />Stock Integrity</h3>
                        <p className="text-gray-600 leading-relaxed mb-8">Track fertilizer consumption, tool distribution, and stock levels. Automated alerts when resources run low.</p>
                        <div className="flex items-center gap-3 text-xs font-bold text-black/40 uppercase tracking-widest border-t border-black/5 pt-6">
                            <BarChart3 className="w-4 h-4" /> Usage Analytics
                        </div>
                    </div>

                    {/* FEATURE: Smart Workforce & Reports */}
                    <div className="bg-black rounded-[3rem] p-10 shadow-2xl group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8FF4C]/10 rounded-bl-full pointer-events-none"></div>
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110">
                            <Users className="w-8 h-8 text-black" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Workforce &<br />Performance</h3>
                        <p className="text-white/60 leading-relaxed mb-8">Automated payroll calculation, attendance tracking, and downloadable PDF performance reports for every worker.</p>
                        <div className="flex items-center gap-3 text-xs font-bold text-[#C8FF4C] uppercase tracking-widest border-t border-white/10 pt-6">
                            <CheckCircle2 className="w-4 h-4" /> Professional PDF Reports
                        </div>
                    </div>

                </div>


                {/* Footer with branding alignment */}
                <div className="mt-12 mb-8 px-4 flex flex-col md:flex-row justify-between items-center text-black/40 text-sm font-medium">
                    <div className="flex items-center gap-2 mb-4 md:mb-0">
                        <Leaf className="w-4 h-4" />
                        <span>TeaPlanter AI • Modernizing Ceylon Tea Excellence</span>
                    </div>
                    <div className="flex gap-8">
                        {['Terms', 'Privacy', 'Contact', 'Press'].map(item => (
                            <a key={item} href="#" className="hover:text-black transition-colors">{item}</a>
                        ))}
                    </div>
                    <p className="mt-4 md:mt-0">© 2026 Tea Planter</p>
                </div>
            </div>
        </div>
    );
}
