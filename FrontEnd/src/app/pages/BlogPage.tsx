import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export function BlogPage() {
    return (
        <div className="min-h-screen bg-[#D7E4DC] font-sans text-gray-900 p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto bg-[#E8F0E9] rounded-[2.5rem] md:rounded-[4rem] min-h-[calc(100vh-4rem)] relative overflow-hidden shadow-2xl border border-white/40 flex flex-col">
                <PublicNavbar />
                
                <div className="relative pt-48 pb-32 px-6 md:px-12 lg:px-20 flex-grow flex items-center justify-center">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider mb-8">
                            Insights
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-8">
                            The Tea Planter Blog
                        </h1>
                        <p className="text-xl text-gray-600 leading-relaxed mb-12">
                            Dive deep into agricultural neural networks, workforce optimization strategies, and the latest releases from our development team.
                        </p>
                    </div>
                </div>

                <div className="mt-auto">
                    <PublicFooter />
                </div>
            </div>
        </div>
    );
}
