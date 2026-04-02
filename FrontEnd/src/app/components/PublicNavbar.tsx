import { useState } from 'react';
import { useClerk } from "@clerk/clerk-react";
import { Leaf, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/app/assets/TeaPlanterLogo3.png';

export function PublicNavbar() {
    const { openSignIn } = useClerk();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogin = () => {
        openSignIn({
            afterSignInUrl: '/dashboard',
            afterSignUpUrl: '/settings',
        });
    };

    const navLinks = [
        { name: 'Platform', path: '/smart-workflow' },
        { name: 'Telemetry', path: '/live-telemetry' },
        { name: 'Guide', path: '/guide' },
        { name: 'Company', path: '/about-us' },
    ];

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] md:w-auto">
            <nav className="bg-black/90 backdrop-blur-xl rounded-full px-4 py-2 flex items-center justify-between md:gap-8 shadow-2xl border border-white/10 relative">
                {/* Logo Pill */}
                <Link to="/" className="flex items-center gap-2 group cursor-pointer pr-4 md:pr-0 border-r border-white/20 md:border-0 pl-2 text-decoration-none transition-transform hover:scale-105">
                    <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
                    <span className="text-white font-bold hidden sm:inline">Tea Planter</span>
                </Link>

                {/* Desktop Nav Items */}
                <div className="hidden lg:flex items-center gap-6">
                    {navLinks.map(item => (
                        <Link key={item.name} to={item.path} className="text-white/70 text-xs font-medium hover:text-white hover:-translate-y-0.5 transition-all cursor-pointer">
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Desktop Action Icons */}
                <div className="flex items-center gap-3 pr-2">
                    <button onClick={handleLogin} className="px-6 py-2 bg-[#C8FF4C] rounded-full text-black text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-lime-500/20">
                        Get Started
                    </button>
                    {/* Mobile Menu Toggle */}
                    <button 
                        className="lg:hidden text-white ml-2 p-1"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Nav Dropdown */}
            {mobileMenuOpen && (
                <div className="absolute top-16 left-0 w-full bg-black/95 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl lg:hidden flex flex-col gap-6 animate-in slide-in-from-top-4 fade-in">
                    {navLinks.map(item => (
                        <Link 
                            key={item.name} 
                            to={item.path} 
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-white/90 font-bold text-lg hover:text-[#C8FF4C] transition-colors border-b border-white/10 pb-4"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <button onClick={handleLogin} className="w-full py-4 bg-[#C8FF4C] rounded-2xl text-black font-bold text-lg hover:scale-[1.02] transition-transform">
                        Login / Sign Up
                    </button>
                </div>
            )}
        </div>
    );
}
