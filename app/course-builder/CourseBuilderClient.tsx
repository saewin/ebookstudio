'use client'

import { useState } from 'react'
import { Project } from '@/lib/notion'
import { BookOpen, Layers, HelpCircle, Send, CheckCircle, Loader2, Plus, Trash2, ChevronDown, ChevronRight, Sparkles, GraduationCap } from 'lucide-react'

interface Lesson {
    title: string
    content: string
    order: number
    quiz?: QuizQuestion[]
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
}

export default function CourseBuilderClient({ projects }: { projects: Project[] }) {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [courseData, setCourseData] = useState<CourseData>({
        title: '',
        description: '',
        lessons: []
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
            lessons: []
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

            // Convert chapters to lessons with professional structure
            const lessons: Lesson[] = [];


            chapters.forEach((ch: any, index: number) => {
                // Determine order and type
                const titleLower = (ch.title || "").toLowerCase();
                const isIntro = /^(introduction|preface|บทนำ|คำนำ|สารบัญ)/.test(titleLower);
                const isConclusion = /^(conclusion|summary|บทสรุป|ส่งท้าย)/.test(titleLower);

                let order = index + 1;
                if (isIntro) order = 0;
                if (isConclusion) order = 999;

                // Clean Title (Remove redundant "Chapter X:" prefix)
                let cleanTitle = ch.title || `บทที่ ${index + 1}`;
                const originalTitle = cleanTitle;
                cleanTitle = cleanTitle.replace(/^(บทที่|chapter)\s*\d+[:\s]*/i, "").trim();
                if (!cleanTitle) cleanTitle = originalTitle; // Revert if we wiped it out entirely

                // Enhanced Content Structure for Active Learning
                let enhancedContent = ch.content || `เนื้อหาจากบท ${ch.chapterNo}: ${ch.title}`;


                const lessonQuiz: QuizQuestion[] = [];
                // Add a placeholder quiz question for regular chapters
                if (!isIntro && !isConclusion) {
                    enhancedContent += `\n\n<h3>🚀 ลงมือทำทันที (Action Item)</h3>\n<p>ลองนำความรู้จากบทนี้ไปปรับใช้กับธุรกิจของคุณ:</p>\n<ul>\n<li>ข้อที่ 1: ...</li>\n<li>ข้อที่ 2: ...</li>\n</ul>`;

                    lessonQuiz.push({
                        question: `คำถามทบทวนจากบท: ${cleanTitle}`,
                        options: ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
                        correctAnswer: 0
                    });
                }

                lessons.push({
                    title: cleanTitle,
                    content: enhancedContent,
                    order: order,
                    quiz: lessonQuiz
                });
            });

            // Sort lessons
            lessons.sort((a, b) => a.order - b.order);

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

    const updateLesson = (index: number, field: Exclude<keyof Lesson, 'quiz'>, value: string | number) => {
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

    const addLessonQuizQuestion = (lessonIndex: number) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.map((lesson, i) =>
                i === lessonIndex ? {
                    ...lesson,
                    quiz: [...(lesson.quiz || []), {
                        question: '',
                        options: ['', '', '', ''],
                        correctAnswer: 0
                    }]
                } : lesson
            )
        }))
    }

    const updateLessonQuizQuestion = (lessonIndex: number, qIndex: number, field: string, value: any) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.map((lesson, i) =>
                i === lessonIndex ? {
                    ...lesson,
                    quiz: (lesson.quiz || []).map((q, j) =>
                        j === qIndex ? { ...q, [field]: value } : q
                    )
                } : lesson
            )
        }))
    }

    const updateLessonQuizOption = (lessonIndex: number, qIndex: number, optIndex: number, value: string) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.map((lesson, i) =>
                i === lessonIndex ? {
                    ...lesson,
                    quiz: (lesson.quiz || []).map((q, j) =>
                        j === qIndex ? {
                            ...q,
                            options: q.options.map((opt, k) => k === optIndex ? value : opt)
                        } : q
                    )
                } : lesson
            )
        }))
    }

    const removeLessonQuizQuestion = (lessonIndex: number, qIndex: number) => {
        setCourseData(prev => ({
            ...prev,
            lessons: prev.lessons.map((lesson, i) =>
                i === lessonIndex ? {
                    ...lesson,
                    quiz: (lesson.quiz || []).filter((_, j) => j !== qIndex)
                } : lesson
            )
        }))
    }

    const publishToAcademy = async () => {
        setIsPublishing(true)
        setPublishResult(null)

        try {
            const response = await fetch('/api/publish-course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: courseData.title,
                    description: courseData.description,
                    lessons: courseData.lessons,
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

    // Calculate total questions for summary
    const totalQuestions = courseData.lessons.reduce((acc, lesson) => acc + (lesson.quiz?.length || 0), 0);

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
                                        {lesson.quiz && lesson.quiz.length > 0 && (
                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <HelpCircle size={12} /> {lesson.quiz.length}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeLesson(index); }}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {expandedLesson === index && (
                                    <div className="p-4 space-y-6 border-t border-slate-200">
                                        <div className="space-y-3">
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
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm min-h-[150px]"
                                                />
                                            </div>
                                        </div>

                                        {/* Lesson Quiz Section */}
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <HelpCircle size={16} className="text-purple-600" />
                                                    แบบทดสอบท้ายบท ({lesson.quiz?.length || 0} ข้อ)
                                                </h4>
                                                <button
                                                    onClick={() => addLessonQuizQuestion(index)}
                                                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 border border-purple-200 px-2 py-1 rounded bg-white"
                                                >
                                                    <Plus size={12} />
                                                    เพิ่มคำถาม
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {(lesson.quiz || []).map((q, qIndex) => (
                                                    <div key={qIndex} className="bg-white border border-slate-200 rounded p-3 space-y-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="text-xs font-medium text-slate-400">ข้อที่ {qIndex + 1}</div>
                                                            <button
                                                                onClick={() => removeLessonQuizQuestion(index, qIndex)}
                                                                className="text-slate-400 hover:text-red-500"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={q.question}
                                                            onChange={(e) => updateLessonQuizQuestion(index, qIndex, 'question', e.target.value)}
                                                            placeholder="คำถาม..."
                                                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm mb-2"
                                                        />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {q.options.map((opt, optIndex) => (
                                                                <div key={optIndex} className="flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name={`correct-${index}-${qIndex}`}
                                                                        checked={q.correctAnswer === optIndex}
                                                                        onChange={() => updateLessonQuizQuestion(index, qIndex, 'correctAnswer', optIndex)}
                                                                        className="text-green-600"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => updateLessonQuizOption(index, qIndex, optIndex, e.target.value)}
                                                                        placeholder={`ตัวเลือก ${optIndex + 1}`}
                                                                        className={`flex-1 px-2 py-1 border rounded text-xs ${q.correctAnswer === optIndex ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!lesson.quiz || lesson.quiz.length === 0) && (
                                                    <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีแบบทดสอบในบทนี้</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Step 3: Publish */}
            {selectedProject && courseData.lessons.length > 0 && (
                <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">3</span>
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
                            <div>{courseData.lessons.length} บทเรียน • {totalQuestions} คำถาม</div>
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
