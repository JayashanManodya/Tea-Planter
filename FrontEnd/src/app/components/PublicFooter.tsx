import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, MessageSquare, CheckCircle2, Mail, Send, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export function PublicFooter() {
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedbackEmail && feedbackMessage) {
            setIsSubmitted(true);
            setTimeout(() => {
                setIsSubmitted(false);
                setFeedbackEmail('');
                setFeedbackMessage('');
            }, 3000);
            // Here you'd actual send the payload to an API
        }
    };

    const platformLinks = [
        { name: 'Disease Scanner', path: '/disease-scanner' },
        { name: 'Smart Workflow', path: '/smart-workflow' },
        { name: 'Live Telemetry', path: '/live-telemetry' },
        { name: 'AI Chatbot', path: '/ai-assistant' },
        { name: 'Pricing', path: '/pricing' },
        { name: 'API Access', path: '/api-access' },
    ];

    const companyLinks = [
        { name: 'About Us', path: '/about-us' },
        { name: 'Careers', path: '/careers' },
        { name: 'Estate Partners', path: '/estate-partners' },
        { name: 'Blog', path: '/blog' },
        { name: 'Contact', path: '/contact' },
        { name: 'Security', path: '/security' },
    ];

    return (
        <footer className="bg-[#1A1A1A] rounded-[3rem] mx-4 md:mx-8 mb-8 p-12 md:p-20 relative overflow-hidden text-white shadow-2xl border border-white/5">
            {/* Background glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8FF4C]/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
                {/* Brand & Feedback Form (Span 5) */}
                <div className="lg:col-span-5 flex flex-col text-left">
                    <div className="flex items-center gap-3 mb-8 text-left">
                        <img src="/TeaPlanterLogo3.png" alt="Logo" className="w-24 h-24 object-contain" />
                        <span className="text-2xl font-bold tracking-tight text-white">Tea Planter</span>
                    </div>
                    <p className="text-gray-400 mb-10 leading-relaxed max-w-md">
                        Empowering Ceylon tea estates with neural vision, real-time analytics, and automated smart management.
                    </p>
                    
                    {/* Interactive Feedback Form */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl w-full max-w-sm mt-auto shadow-xl">
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-[#C8FF4C]" /> Send Feedback
                        </h4>
                        {isSubmitted ? (
                            <div className="bg-[#C8FF4C]/10 border border-[#C8FF4C]/20 p-4 rounded-xl flex items-center justify-center gap-3 text-[#C8FF4C] font-semibold animate-in zoom-in fade-in duration-300">
                                <CheckCircle2 className="w-5 h-5" /> Transmitted!
                            </div>
                        ) : (
                            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="email" 
                                        placeholder="Your Email" 
                                        required
                                        value={feedbackEmail}
                                        onChange={(e) => setFeedbackEmail(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C8FF4C]/50 focus:ring-1 focus:ring-[#C8FF4C]/50 transition-all font-medium"
                                    />
                                </div>
                                <div className="relative">
                                    <textarea 
                                        placeholder="Your ideas or issues..." 
                                        required
                                        rows={2}
                                        value={feedbackMessage}
                                        onChange={(e) => setFeedbackMessage(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#C8FF4C]/50 focus:ring-1 focus:ring-[#C8FF4C]/50 transition-all resize-none font-medium"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="w-full bg-white text-black font-bold text-sm py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-[#C8FF4C] hover:scale-[1.02] transition-all shadow-sm"
                                >
                                    Send <Send className="w-4 h-4" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Navigation Links Group (Span 7) */}
                <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8 text-left mt-4 lg:mt-0">
                    {/* Product Links */}
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-[#C8FF4C] uppercase text-xs tracking-widest mb-2">Platform</h4>
                        {platformLinks.map((link) => (
                            <Link key={link.name} to={link.path} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all text-sm font-medium">
                                {link.name}
                            </Link>
                        ))}
                    </div>
                    {/* Company Links */}
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-[#C8FF4C] uppercase text-xs tracking-widest mb-2">Company</h4>
                        {companyLinks.map((link) => (
                            <Link key={link.name} to={link.path} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all text-sm font-medium">
                                {link.name}
                            </Link>
                        ))}
                    </div>
                    {/* Social & Legal */}
                    <div className="flex flex-col col-span-2 md:col-span-1 gap-4">
                        <h4 className="font-bold text-[#C8FF4C] uppercase text-xs tracking-widest mb-2">Connect</h4>
                        <div className="flex items-center gap-3 mb-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, idx) => (
                                <a key={idx} href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center hover:bg-[#C8FF4C] hover:text-black hover:-translate-y-1 transition-all text-gray-400 shadow-xl">
                                    <Icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                        <h4 className="font-bold text-[#C8FF4C] uppercase text-xs tracking-widest mt-4 mb-2">Legal</h4>
                        {['Terms of Service', 'Privacy Policy'].map((link) => (
                            <a key={link} href="#" className="text-gray-500 hover:text-white transition-all text-xs font-medium">
                                {link}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between text-gray-500 text-xs font-semibold relative z-10">
                <p>© 2026 Tea Planter. All rights reserved.</p>
                <p className="mt-2 md:mt-0 flex items-center gap-1 group">
                    Designed with <Leaf className="w-3 h-3 text-[#C8FF4C] group-hover:scale-125 transition-transform" /> in Sri Lanka.
                </p>
            </div>
        </footer>
    );
}
