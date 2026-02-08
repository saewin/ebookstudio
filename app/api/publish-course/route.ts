
import { NextResponse } from 'next/server';

const WP_API_URL = "https://course.selfpreneur.club/wp-json";
const USER = process.env.WORDPRESS_APP_USER || "MCP Server";
const PASS = process.env.WORDPRESS_APP_PASSWORD || "rlln 6cXF AhEa Rh3n 3BRy TUry"; // Fallback if env missing

const AUTH = Buffer.from(`${USER}:${PASS.replace(/ /g, '')}`).toString('base64');

async function wpFetch(endpoint: string, method: string, body?: any) {
    const res = await fetch(`${WP_API_URL}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${AUTH}`
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`WP API Error (${res.status}): ${errText}`);
    }
    return res.json();
}

export async function POST(req: Request) {
    try {
        const { title, description, lessons, quiz } = await req.json();

        if (!title || !lessons) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`🚀 Starting course publication: "${title}"`);

        // 1. Create Course
        const courseData = await wpFetch('/wp/v2/lp_course', 'POST', {
            title: title,
            content: description, // Use description as content, or maybe combine with Intro
            status: 'publish'
        });
        const courseId = courseData.id;
        console.log(`✅ Created Course: ${courseId}`);

        // 2. Create Lessons & Quizzes
        const sectionItems = [];

        // Organize lessons: Group by "Module 1" logic or keep simple list
        // Strategy: Create "Main Content" section for all lessons
        const lessonIds = [];

        for (const lesson of lessons) {
            const lessonRes = await wpFetch('/wp/v2/lp_lesson', 'POST', {
                title: lesson.title,
                content: lesson.content,
                status: 'publish'
            });
            lessonIds.push(lessonRes.id);
            console.log(`   - Created Lesson: "${lesson.title}" (${lessonRes.id})`);
        }

        // 3. Create Quiz (Final Assessment) if questions exist
        let quizId = null;
        if (quiz && quiz.length > 0) {
            console.log(`📝 Creating Quiz with ${quiz.length} questions...`);

            // Format Quiz Content for V1 (Text-based fallback)
            let quizContent = '<h3>แบบทดสอบวัดความเข้าใจ</h3>\n<p>จงเลือกคำตอบที่ถูกต้องที่สุด:</p>\n<hr>\n';

            quiz.forEach((q: any, i: number) => {
                quizContent += `<div style="margin-bottom: 20px;">
                    <strong>ข้อที่ ${i + 1}: ${q.question}</strong>
                    <ul style="list-style-type: none; padding-left: 0;">`;

                q.options.forEach((opt: any, j: number) => {
                    const isCorrect = j === q.correctAnswer;
                    quizContent += `<li style="${isCorrect ? 'color: green; font-weight: bold;' : 'color: #333;'}">
                        ${isCorrect ? '✅' : '⚪'} ${opt}
                     </li>`;
                });

                quizContent += `</ul></div>`;
            });

            // Create Quiz Post
            const quizRes = await wpFetch('/wp/v2/lp_quiz', 'POST', {
                title: `แบบทดสอบท้ายบทเรียน (Final Quiz)`,
                content: quizContent,
                status: 'publish'
            });
            quizId = quizRes.id;
            console.log(`   - Created Quiz: ${quizId}`);
        }

        // 4. Organize Curriculum
        // Create Sections: 
        // - "Introduction" (if first lesson is Intro)
        // - "Course Content"
        // - "Assessment"

        const sections = [];
        const mainItems = [...lessonIds];
        if (quizId) mainItems.push(quizId);

        // Simple single section for V1 stability
        sections.push({
            title: "บทเรียนทั้งหมด (All Lessons)",
            items: mainItems
        });

        console.log("🏗️ Organizing Curriculum...");
        const organizeRes = await wpFetch('/spa/v1/organize-course', 'POST', {
            course_id: courseId,
            sections: sections
        });

        return NextResponse.json({
            success: true,
            courseId: courseId,
            courseUrl: courseData.link
        });

    } catch (error: any) {
        console.error('Error publishing course:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
