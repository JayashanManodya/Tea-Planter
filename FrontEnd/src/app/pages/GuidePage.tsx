import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export function GuidePage() {
    return (
        <div className="min-h-screen bg-[#D7E4DC] font-sans text-gray-900 p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto bg-[#E8F0E9] rounded-[2.5rem] md:rounded-[4rem] min-h-[calc(100vh-4rem)] relative overflow-hidden shadow-2xl border border-white/40 flex flex-col">
                <PublicNavbar />
                
                <div className="relative pt-48 pb-32 px-6 md:px-12 lg:px-20 flex-grow">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider mb-8">
                            Knowledge Base
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-8">
                            Platform Guide
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed">
                            Master every module of the Tea Planter ecosystem. From managing your workforce to leveraging neural-vision scanners for crop health, explore how the entire system connects.
                        </p>
                    </div>

                    {/* Quick Guide Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Disease Scanner Guide */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-transform">
                            <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <span className="text-[#C8FF4C] font-bold text-xl">1</span>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-900">Neural Diagnosis</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Upload photos of affected tea leaves. Our advanced Convolutional Neural Network instantly identifies pathogens and yields specific chemical and organic remedy plans.
                            </p>
                        </div>

                        {/* Smart Workforce Guide */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-transform">
                            <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <span className="text-[#C8FF4C] font-bold text-xl">2</span>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-900">Workforce Parsing</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Track attendance down to the millisecond. Generate automated financial reports and instantly pair worker accounts with daily harvest weights from the telemetry scales.
                            </p>
                        </div>

                        {/* Live Telemetry Guide */}
                        <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-transform">
                            <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                <span className="text-[#C8FF4C] font-bold text-xl">3</span>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-gray-900">Live Telemetry</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Every harvest basket weighed is beamed securely to your digital cockpit. View yield histograms, forecast production levels, and synchronize directly with your factories.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-auto">
                    <PublicFooter />
                </div>
            </div>
        </div>
    );
}
