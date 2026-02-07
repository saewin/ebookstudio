'use client'

import { useState } from 'react'
import { Project } from '@/lib/notion'
import { BookOpen, Layers, HelpCircle, Send, CheckCircle, Loader2, Plus, Trash2, ChevronDown, ChevronRight, Sparkles, GraduationCap } from 'lucide-react'

interface Lesson {
    title: string
    content: string
    order: number
}

interface QuizQuestion {
    question: string
    options: string[]
    correctAnswer: number
}

interface CourseData {
    title: string
    description: string
    lessons: Lesson[]
    quiz: QuizQuestion[]
}

export default function CourseBuilderClient({ projects }: { projects: Project[] }) {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [courseData, setCourseData] = useState<CourseData>({
        title: '',
        description: '',
        lessons: [],
        quiz: []
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [publishResult, setPublishResult] = useState<{ success: boolean; message: string; url?: string } | null>(null)
    const [expandedLesson, setExpandedLesson] = useState<number | null>(null)

    const handleProjectSelect = async (project: Project) => {
        setSelectedProject(project)
        setCourseData({
            title: project.title,
            description: `คอร์สเรียนจากหนังสือ "${project.title}" - ${project.theme}`,
            lessons: [],
            quiz: []
        })
        setPublishResult(null)
    }

    const generateLessonsFromBook = async () => {
        if (!selectedProject) return
        setIsGenerating(true)

        try {
            // Fetch chapters for this project
            const response = await fetch(`/api/chapters?projectId=${selectedProject.id}`)
            const chapters = await response.json()

            // Convert chapters to lessons
            const lessons: Lesson[] = chapters.map((ch: any, index: number) => ({
                title: ch.title,
                content: ch.content || `เนื้อหาจากบท ${ch.chapterNo}: ${ch.title}`,
                order: index + 1
            }))

            setCourseData(prev => ({
                ...prev,
                lessons
            }))
        } catch (error) {
            console.error('Error generating lessons:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const addLesson = () => {
        setCourseData(prev => ({
            ...prev,
            lessons: [...prev.lessons, {
                title: `บทเรียนที่ ${prev.lessons.length + 1}`,
                content: '',
                order: prev.lessons.length + 1
            }]
        }))
    }

    const updateLesson = (index: number, field: keyof Lesson, value: string | number) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.map((lesson, i) =>
                i === index ? { ...lesson, [field]: value } : lesson
            )
        }))
    }

    const removeLesson = (index: number) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.filter((_, i) => i !== index)
        }))
    }

    const addQuizQuestion = () => {
        setCourseData(prev => ({
            ...prev,
            quiz: [...prev.quiz, {
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0
            }]
        }))
    }

    const updateQuizQuestion = (index: number, field: string, value: any) => {
        setCourseData(prev => ({
            ...prev,
            quiz: prev.quiz.map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            )
        }))
    }

    const updateQuizOption = (qIndex: number, optIndex: number, value: string) => {
        setCourseData(prev => ({
            ...prev,
            quiz: prev.quiz.map((q, i) =>
                i === qIndex ? {
                    ...q,
                    options: q.options.map((opt, j) => j === optIndex ? value : opt)
                } : q
            )
        }))
    }

    const removeQuizQuestion = (index: number) => {
        setCourseData(prev => ({
            ...prev,
            quiz: prev.quiz.filter((_, i) => i !== index)
        }))
    }

    const publishToAcademy = async () => {
        setIsPublishing(true)
        setPublishResult(null)

        try {
            const response = await fetch('https://selfpreneur.club/api/publish-course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: courseData.title,
                    description: courseData.description,
                    lessons: courseData.lessons,
                    quiz: courseData.quiz,
                    source: 'ebook-studio',
                    projectId: selectedProject?.id
                })
            })

            const result = await response.json()

            if (response.ok) {
                setPublishResult({
                    success: true,
                    message: 'ส่งคอร์สไปยัง Selfpreneur Academy สำเร็จ!',
                    url: result.courseUrl
                })
            } else {
                setPublishResult({
                    success: false,
                    message: result.error || 'เกิดข้อผิดพลาดในการส่งคอร์ส'
                })
            }
        } catch (error) {
            setPublishResult({
                success: false,
                message: 'ไม่สามารถเชื่อมต่อกับ Selfpreneur Academy ได้'
            })
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <GraduationCap className="text-blue-600" size={28} />
                        สร้างบทเรียน (Course Builder)
                    </h1>
                    <p className="text-slate-500 mt-1">แปลง E-book เป็นคอร์สเรียนออนไลน์ พร้อมส่งไปยัง Selfpreneur Academy</p>
                </div>
            </div>

            {/* Step 1: Select Project */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
                    เลือก E-book ที่ต้องการแปลง
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${selectedProject?.id === project.id
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-slate-200 hover:border-blue-300 bg-white'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <BookOpen className={selectedProject?.id === project.id ? 'text-blue-600' : 'text-slate-400'} size={20} />
                                {selectedProject?.id === project.id && (
                                    <CheckCircle className="text-blue-600" size={20} />
                                )}
                            </div>
                            <h3 className="font-medium text-slate-900 mt-2">{project.title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{project.theme}</p>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-2 ${project.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {project.status}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Step 2: Course Details & Lessons */}
            {selectedProject && (
                <section className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
                        สร้างบทเรียน
                    </h2>

                    {/* Course Title & Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อคอร์ส</label>
                            <input
                                type="text"
                                value={courseData.title}
                                onChange={(e) => setCourseData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย</label>
                            <input
                                type="text"
                                value={courseData.description}
                                onChange={(e) => setCourseData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Generate from Book Button */}
                    <button
                        onClick={generateLessonsFromBook}
                        disabled={isGenerating}
                        className="mb-6 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Sparkles size={18} />
                        )}
                        ดึงบทเรียนจาก E-book อัตโนมัติ
                    </button>

                    {/* Lessons List */}
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-slate-800 flex items-center gap-2">
                                <Layers size={18} />
                                บทเรียน ({courseData.lessons.length} บท)
                            </h3>
                            <button
                                onClick={addLesson}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus size={16} />
                                เพิ่มบทเรียน
                            </button>
                        </div>

                        {courseData.lessons.map((lesson, index) => (
                            <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                                    onClick={() => setExpandedLesson(expandedLesson === index ? null : index)}
                                >
                                    <div className="flex items-center gap-3">
                                        {expandedLesson === index ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-slate-700">{lesson.title}</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeLesson(index); }}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {expandedLesson === index && (
                                    <div className="p-4 space-y-3 border-t border-slate-200">
                                        <div>
                                            <label className="block text-sm text-slate-600 mb-1">ชื่อบทเรียน</label>
                                            <input
                                                type="text"
                                                value={lesson.title}
                                                onChange={(e) => updateLesson(index, 'title', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 mb-1">เนื้อหา</label>
                                            <textarea
                                                value={lesson.content}
                                                onChange={(e) => updateLesson(index, 'content', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Step 3: Quiz Section */}
            {selectedProject && courseData.lessons.length > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">3</span>
                        สร้างคำถาม-คำตอบ (Quiz)
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-slate-800 flex items-center gap-2">
                                <HelpCircle size={18} />
                                คำถาม ({courseData.quiz.length} ข้อ)
                            </h3>
                            <button
                                onClick={addQuizQuestion}
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <Plus size={16} />
                                เพิ่มคำถาม
                            </button>
                        </div>

                        {courseData.quiz.map((q, qIndex) => (
                            <div key={qIndex} className="border border-slate-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium">
                                        {qIndex + 1}
                                    </span>
                                    <button
                                        onClick={() => removeQuizQuestion(qIndex)}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">คำถาม</label>
                                    <input
                                        type="text"
                                        value={q.question}
                                        onChange={(e) => updateQuizQuestion(qIndex, 'question', e.target.value)}
                                        placeholder="พิมพ์คำถามที่นี่..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {q.options.map((opt, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`correct-${qIndex}`}
                                                checked={q.correctAnswer === optIndex}
                                                onChange={() => updateQuizQuestion(qIndex, 'correctAnswer', optIndex)}
                                                className="text-green-600"
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => updateQuizOption(qIndex, optIndex, e.target.value)}
                                                placeholder={`ตัวเลือก ${optIndex + 1}`}
                                                className={`flex-1 px-3 py-2 border rounded-lg text-sm ${q.correctAnswer === optIndex ? 'border-green-400 bg-green-50' : 'border-slate-200'
                                                    }`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">* เลือกวงกลมหน้าคำตอบที่ถูกต้อง</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Step 4: Publish */}
            {selectedProject && courseData.lessons.length > 0 && (
                <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">4</span>
                        ส่งไปยัง Selfpreneur Academy
                    </h2>
                    <p className="text-blue-100 text-sm mb-4">
                        คอร์สจะถูกสร้างที่ course.selfpreneur.club และแสดงผลบน selfpreneur.club/all-courses
                    </p>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={publishToAcademy}
                            disabled={isPublishing}
                            className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2 shadow-lg"
                        >
                            {isPublishing ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Send size={20} />
                            )}
                            {isPublishing ? 'กำลังส่ง...' : 'ส่งคอร์สเลย'}
                        </button>

                        <div className="text-sm">
                            <div className="text-white/80">สรุป:</div>
                            <div>{courseData.lessons.length} บทเรียน • {courseData.quiz.length} คำถาม</div>
                        </div>
                    </div>

                    {publishResult && (
                        <div className={`mt-4 p-4 rounded-lg ${publishResult.success ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <div className="flex items-center gap-2">
                                {publishResult.success ? (
                                    <CheckCircle size={20} />
                                ) : (
                                    <span className="text-red-200">⚠️</span>
                                )}
                                <span>{publishResult.message}</span>
                            </div>
                            {publishResult.url && (
                                <a
                                    href={publishResult.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-block text-white underline hover:no-underline"
                                >
                                    ดูคอร์ส →
                                </a>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
