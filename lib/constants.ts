export const SERIES_DB_ID = '2e9e19eb-e8da-807f-9fbd-ec5224452851';
export const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;

export const statusMapping: Record<string, string> = {
    "Approved": "อนุมัติแล้ว",
    "Reviewing": "รอตรวจทาน",
    "Drafting": "กำลังเขียน",
    "To Do": "รอดำเนินการ",
    "Done": "เสร็จสิ้น"
};

export const statusStyles: Record<string, string> = {
    "อนุมัติแล้ว": "bg-sky-100 text-sky-700 border-sky-200",
    "กำลังเขียน": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "รอดำเนินการ": "bg-slate-50 text-slate-500 border-slate-200",
    "เสร็จสิ้น": "bg-green-50 text-green-700 border-green-200",
    "รอตรวจทาน": "bg-orange-50 text-orange-700 border-orange-200",
};
