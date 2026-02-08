import Link from 'next/link'
import { Plus, BookOpen, Clock, TrendingUp, MoreHorizontal, ArrowRight, Settings, ExternalLink } from 'lucide-react'
import { getProjects } from '@/lib/notion'
import { statusStyles } from '@/lib/constants'

export default async function Home() {
  const projects = await getProjects()
  const recentProjects = projects.slice(0, 5)

  // Calculate some basic stats
  const activeProjectsCount = projects.filter(p => p.status !== 'Done' && p.status !== 'เสร็จสิ้น').length

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
          title="โปรเจกต์ทั้งหมด"
          value={projects.length.toString()}
          icon={BookOpen}
          trend={`กำลังดำเนินการ ${activeProjectsCount}`}
          trendUp={true}
        />
        <StatCard
          title="โปรเจกต์ใหม่ (เดือนนี้)"
          value="1"
          icon={Clock}
          trend="+1 สัปดาห์นี้"
          trendUp={true}
        />
        <StatCard
          title="อัตราความสำเร็จ"
          value="100%"
          icon={TrendingUp}
          trend="เป็นไปตามแผน"
          trendUp={true}
        />
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">โปรเจกต์ล่าสุด</h2>
          <Link href="/structure" className="text-sm text-slate-500 hover:text-primary transition-colors flex items-center gap-1">
            ดูทั้งหมด <ArrowRight size={14} />
          </Link>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-white shadow-sm shadow-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-medium">ชื่อโปรเจกต์</th>
                  <th className="px-6 py-3 font-medium">สถานะ</th>
                  <th className="px-6 py-3 font-medium">จัดการ</th>
                  <th className="px-6 py-3 font-medium">อัปเดตล่าสุด</th>
                  <th className="px-6 py-3 text-right font-medium">ลิงก์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    id={project.id}
                    name={project.title}
                    status={project.status}
                    date={new Date(project.lastEditedTime).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  />
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      ยังไม่มีโปรเจกต์ในระบบ เริ่มสร้างเล่มแรกของคุณได้เลย!
                    </td>
                  </tr>
                )}
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

function ProjectRow({ id, name, status, date }: any) {
  // Translate status for style lookup
  const statusThai = status === 'Reviewing' ? 'รอตรวจทาน' :
    status === 'Drafting' ? 'กำลังเขียน' :
      status === 'Approved' ? 'อนุมัติแล้ว' :
        status === 'Done' ? 'เสร็จสิ้น' : 'รอดำเนินการ';

  return (
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-10 bg-blue-50 border border-blue-100 rounded-sm flex items-center justify-center text-blue-200">
            <BookOpen size={12} />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{name}</p>
            <p className="text-xs text-slate-400">Ebook Project</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[statusThai] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {statusThai}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Link href={`/writing?projectId=${id}`}>
            <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50" title="โต๊ะเขียนงาน">
              <Plus size={16} />
            </button>
          </Link>
          <Link href={`/structure?projectId=${id}`}>
            <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50" title="โครงสร้างเล่ม">
              <Settings size={16} />
            </button>
          </Link>
        </div>
      </td>
      <td className="px-6 py-4 text-xs text-slate-500 uppercase">{date}</td>
      <td className="px-6 py-4 text-right">
        <Link href={`/export/view/${id}`}>
          <button className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
            <ExternalLink size={14} />
            ดูเล่มจริง
          </button>
        </Link>
      </td>
    </tr>
  )
}
