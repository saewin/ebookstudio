import { Image as ImageIcon, RefreshCw, Download } from 'lucide-react'

export default function GalleryPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Art Gallery</h1>
                    <p className="text-slate-500 mt-2">Manage visual assets. 12 images generated so far.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline">Style Settings</button>
                    <button className="btn btn-primary">
                        <RefreshCw size={18} /> Generate Missing
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="card bg-white dark:bg-slate-900 p-0 overflow-hidden group">
                        <div className="aspect-video bg-slate-100 relative">
                            {/* Placeholder for real image */}
                            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                <ImageIcon size={48} />
                            </div>

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button className="btn bg-white text-slate-900 py-1.5 px-3 text-xs hover:bg-slate-100">
                                    Regenerate
                                </button>
                                <button className="btn bg-white/20 text-white py-1.5 px-3 text-xs hover:bg-white/30 backdrop-blur-sm">
                                    <Download size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm font-medium text-slate-900">Chapter {i} Cover</p>
                            <p className="text-xs text-slate-500 mt-1 truncate">Prompt: A futuristic office with transparent screens...</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
