import Link from 'next/link'
import { Plus, BookOpen, Clock, TrendingUp, MoreHorizontal, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">ภาพรวม (Overview)</h1>
          <p className="text-slate-500 mt-1 text-sm">ยินดีต้อนรับกลับครับ นี่คือไฮไลท์สตูดิโอของคุณวันนี้</p>
        </div>
        <Link href="/briefing">
          <button className="bg-primary text-primary-foreground hover:opacity-90 px-5 py-2.5 rounded-md flex items-center gap-2 text-sm font-medium transition-all shadow-sm shadow-blue-200">
            <Plus size={16} />
            สร้างโปรเจกต์ใหม่
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="โปรเจกต์ที่กำลังทำ"
          value="3"
          icon={BookOpen}
          trend="+1 สัปดาห์นี้"
          trendUp={true}
        />
        <StatCard
          title="คำที่เขียนไปแล้ว"
          value="12.5k"
          icon={Clock}
          trend="+2.5k วันนี้"
          trendUp={true}
        />
        <StatCard
          title="อัตราความสำเร็จ"
          value="85%"
          icon={TrendingUp}
          trend="เป็นไปตามแผน"
          trendUp={true}
        />
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">โปรเจกต์ล่าสุด</h2>
          <button className="text-sm text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
            ดูทั้งหมด <ArrowRight size={14} />
          </button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-white shadow-sm shadow-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">ชื่อโปรเจกต์</th>
                  <th className="px-6 py-3 font-medium">สถานะ</th>
                  <th className="px-6 py-3 font-medium">ความคืบหน้า</th>
                  <th className="px-6 py-3 font-medium">อัปเดตล่าสุด</th>
                  <th className="px-6 py-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <ProjectRow
                  name="AI สำหรับนักกฎหมาย"
                  status="กำลังเขียน"
                  progress={60}
                  date="วันนี้, 10:23 น."
                />
                <ProjectRow
                  name="ซื้อขายคริปโต 101"
                  status="ตรวจทาน"
                  progress={90}
                  date="เมื่อวานนี้"
                />
                <ProjectRow
                  name="คู่มือสุขภาพดี"
                  status="วางแผน"
                  progress={10}
                  date="15 ม.ค. 2026"
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: any) {
  return (
    <div className="p-6 rounded-lg border border-border bg-white hover:border-blue-200 hover:shadow-sm transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <Icon size={18} className="text-blue-500" />
      </div>
      <div>
        <h3 className="text-3xl font-semibold text-foreground tracking-tight">{value}</h3>
        <p className={`text-xs mt-2 ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend}
        </p>
      </div>
    </div>
  )
}

function ProjectRow({ name, status, progress, date }: any) {
  const statusStyles: any = {
    'กำลังเขียน': 'bg-blue-50 text-blue-700 border-blue-100',
    'ตรวจทาน': 'bg-amber-50 text-amber-700 border-amber-100',
    'วางแผน': 'bg-slate-50 text-slate-700 border-slate-200',
    'เสร็จสิ้น': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }

  return (
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-10 bg-blue-50 border border-blue-100 rounded-sm flex items-center justify-center text-blue-200">
            <BookOpen size={12} />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{name}</p>
            <p className="text-xs text-slate-400">Kindle Edition</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || 'bg-gray-100'}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 mt-1.5 block">{progress}%</span>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">{date}</td>
      <td className="px-6 py-4 text-right">
        <button className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded-md hover:bg-blue-50">
          <MoreHorizontal size={16} />
        </button>
      </td>
    </tr>
  )
}
