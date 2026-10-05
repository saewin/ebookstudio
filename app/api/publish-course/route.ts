
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


        const curriculumItems: number[] = [];

        for (const lesson of lessons) {
            // 2.1 Create Lesson
            const lessonRes = await wpFetch('/wp/v2/lp_lesson', 'POST', {
                title: lesson.title,
                content: lesson.content,
                status: 'publish'
            });
            const lessonId = lessonRes.id;
            curriculumItems.push(lessonId);
            console.log(`   - Created Lesson: "${lesson.title}" (${lessonId})`);

            // 2.2 Create Lesson Quiz (if exists)
            if (lesson.quiz && lesson.quiz.length > 0) {
                // Format Quiz Content
                let quizContent = '<h3>แบบทดสอบวัดความเข้าใจ</h3>\n<p>จงเลือกคำตอบที่ถูกต้องที่สุด:</p>\n<hr>\n';

                lesson.quiz.forEach((q: any, i: number) => {
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
                    title: `แบบทดสอบ: ${lesson.title}`,
                    content: quizContent,
                    status: 'publish'
                });
                const quizId = quizRes.id;
                curriculumItems.push(quizId); // Add quiz immediately after lesson
                console.log(`     -> Created Quiz: ${quizId}`);
            }
        }





        // 2b. Create Final Quiz (Interactive via SPA/V1)
        if (quiz && quiz.length > 0) {
            console.log(`📝 Creating Final Quiz with ${quiz.length} questions...`);

            try {
                // 1. Create Quiz Post
                // Need to construct payload for wpFetch (which wraps fetch)
                const quizRes = await wpFetch('/wp/v2/lp_quiz', 'POST', {
                    title: 'แบบทดสอบสุดท้าย (Final Assessment)',
                    content: '<!-- wp:paragraph --><p>Please answer the following questions to complete the course.</p><!-- /wp:paragraph -->',
                    status: 'publish'
                });
                const quizId = quizRes.id;
                console.log(`   -> Created Quiz: ${quizId}`);

                // 2. Create Questions via Custom Endpoint
                const questionIds = [];
                for (let i = 0; i < quiz.length; i++) {
                    const q = quiz[i];
                    // Map options
                    const options = q.options.map((opt: any, idx: number) => ({
                        text: opt,
                        is_true: (idx === q.correctAnswer) ? 'yes' : 'no'
                    }));


                    const type = options.length > 2 ? 'single_choice' : 'true_or_false';

                    // Call spa/v1/create-question
                    const questionRes = await wpFetch('/spa/v1/create-question', 'POST', {
                        title: `Question ${i + 1}: ${q.question.substring(0, 50)}...`,
                        content: q.question,
                        type: type,
                        mark: 5,
                        options: options,
                        explanation: `Correct answer is: ${q.options[q.correctAnswer]}`
                    });

                    if (questionRes && questionRes.id) {
                        questionIds.push(questionRes.id);
                    }
                }

                // 3. Assign Questions to Quiz
                if (questionIds.length > 0) {
                    await wpFetch('/spa/v1/assign-quiz-questions', 'POST', {
                        quiz_id: quizId,
                        question_ids: questionIds
                    });
                    console.log(`   -> Assigned ${questionIds.length} questions to Quiz ${quizId}`);
                }

                // Add Quiz to Curriculum
                curriculumItems.push(quizId);

            } catch (err) {
                console.error("❌ Failed to create interactive quiz:", err);
            }
        }

        const sections = [];

        // Simple single section for V1 stability
        sections.push({
            title: "เนื้อหาบทเรียน (Course Content)",
            items: curriculumItems
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
