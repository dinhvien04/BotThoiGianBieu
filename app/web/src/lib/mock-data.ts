export interface Schedule {
  id: number;
  title: string;
  description: string;
  type: "cong-viec" | "ca-nhan" | "hop-hanh" | "hoc-tap" | "nghien-cuu" | "tai-chinh" | "marketing";
  start: string;
  end: string;
  priority: "cao" | "trung-binh" | "thap";
  status: "dang-cho" | "dang-thuc-hien" | "hoan-thanh" | "qua-han";
  reminder?: number;
  recurrence?: "daily" | "weekly" | "monthly" | null;
  tags: string[];
  location?: string;
  participants?: string[];
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  count: number;
}

export interface Template {
  id: number;
  title: string;
  description: string;
  type: string;
  priority: "cao" | "trung-binh" | "thap";
  duration: number;
  reminder?: number;
  tags: string[];
}

export const mockSchedules: Schedule[] = [
  {
    id: 1,
    title: "Họp Team Design",
    description: "Thảo luận tiến độ và giải quyết vướng mắc sprint hiện tại",
    type: "hop-hanh",
    start: "2024-10-02T09:00:00",
    end: "2024-10-02T10:00:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 15,
    recurrence: null,
    tags: ["Công việc"],
    location: "Phòng họp 02",
  },
  {
    id: 2,
    title: "Review Sprint Q3",
    description: "Review kết quả sprint Q3 với toàn bộ team",
    type: "hop-hanh",
    start: "2024-10-04T14:30:00",
    end: "2024-10-04T16:00:00",
    priority: "cao",
    status: "dang-thuc-hien",
    reminder: 15,
    recurrence: null,
    tags: ["Công việc", "Q3-Strategic"],
    location: "Online Zoom",
  },
  {
    id: 3,
    title: "Workshop UI/UX",
    description: "Workshop về thiết kế UI/UX cho team frontend",
    type: "hoc-tap",
    start: "2024-10-06T10:00:00",
    end: "2024-10-06T12:00:00",
    priority: "trung-binh",
    status: "dang-cho",
    reminder: 30,
    recurrence: null,
    tags: ["Học tập"],
  },
  {
    id: 4,
    title: "Gặp đối tác",
    description: "Gặp gỡ và thảo luận với đối tác về dự án mới",
    type: "cong-viec",
    start: "2024-10-10T14:00:00",
    end: "2024-10-10T15:30:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 30,
    recurrence: null,
    tags: ["Công việc"],
    location: "Phòng họp tầng 4",
  },
  {
    id: 5,
    title: "Deadline Báo cáo",
    description: "Nộp báo cáo tổng kết Q3",
    type: "cong-viec",
    start: "2024-10-12T09:00:00",
    end: "2024-10-12T17:00:00",
    priority: "cao",
    status: "qua-han",
    reminder: 60,
    recurrence: null,
    tags: ["Công việc"],
  },
  {
    id: 6,
    title: "Họp đầu tuần Team Marketing",
    description: "Sync up kế hoạch marketing tuần mới",
    type: "hop-hanh",
    start: "2024-10-24T08:00:00",
    end: "2024-10-24T09:30:00",
    priority: "trung-binh",
    status: "dang-cho",
    reminder: 15,
    recurrence: "weekly",
    tags: ["Công việc"],
    location: "Phòng họp 02",
  },
  {
    id: 7,
    title: "Review thiết kế Dashboard UI",
    description: "Review và feedback thiết kế Dashboard mới",
    type: "cong-viec",
    start: "2024-10-24T10:15:00",
    end: "2024-10-24T11:30:00",
    priority: "trung-binh",
    status: "dang-cho",
    reminder: 15,
    recurrence: null,
    tags: ["Công việc"],
    location: "Online Zoom",
  },
  {
    id: 8,
    title: "Tập trung: Code tính năng mới",
    description: "Deep work session - code tính năng mới cho dashboard",
    type: "cong-viec",
    start: "2024-10-24T14:00:00",
    end: "2024-10-24T16:00:00",
    priority: "cao",
    status: "dang-thuc-hien",
    reminder: 10,
    recurrence: null,
    tags: ["Công việc"],
  },
  {
    id: 9,
    title: "Daily Standup",
    description: "Daily standup meeting",
    type: "hop-hanh",
    start: "2024-10-24T17:00:00",
    end: "2024-10-24T17:30:00",
    priority: "thap",
    status: "dang-cho",
    reminder: 5,
    recurrence: "daily",
    tags: ["Công việc"],
    location: "Văn phòng",
  },
  {
    id: 10,
    title: "Hoàn thiện báo cáo Q3",
    description: "Hoàn thiện báo cáo tổng kết quý 3",
    type: "cong-viec",
    start: "2024-10-25T09:00:00",
    end: "2024-10-25T17:00:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 60,
    recurrence: null,
    tags: ["Công việc"],
  },
  {
    id: 11,
    title: "Gửi email cho đối tác",
    description: "Gửi email cập nhật tiến độ cho đối tác Dự án Alpha",
    type: "cong-viec",
    start: "2024-10-25T10:00:00",
    end: "2024-10-25T10:30:00",
    priority: "trung-binh",
    status: "dang-cho",
    reminder: 15,
    recurrence: null,
    tags: ["Công việc"],
  },
  {
    id: 12,
    title: "Chuẩn bị nội dung Workshop",
    description: "Chuẩn bị slide và nội dung cho Workshop UI/UX sắp tới",
    type: "cong-viec",
    start: "2024-10-26T09:00:00",
    end: "2024-10-26T12:00:00",
    priority: "trung-binh",
    status: "dang-cho",
    reminder: 30,
    recurrence: null,
    tags: ["Công việc"],
  },
  {
    id: 13,
    title: "Phỏng vấn ứng viên Senior Designer",
    description: "Phỏng vấn ứng viên cho vị trí Senior Designer",
    type: "hop-hanh",
    start: "2024-10-18T14:00:00",
    end: "2024-10-18T15:00:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 30,
    recurrence: null,
    tags: ["Công việc"],
    participants: ["HR Team"],
  },
  {
    id: 14,
    title: "Kick-off dự án SmartHome 2.0",
    description: "Kick-off meeting cho dự án SmartHome 2.0",
    type: "hop-hanh",
    start: "2024-10-20T09:00:00",
    end: "2024-10-20T11:00:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 30,
    recurrence: null,
    tags: ["Dự án"],
    location: "Google Meet",
  },
  {
    id: 15,
    title: "Tập Thể Dục Sáng",
    description: "Chạy bộ hoặc Cardio tại nhà",
    type: "ca-nhan",
    start: "2024-10-24T06:00:00",
    end: "2024-10-24T06:45:00",
    priority: "trung-binh",
    status: "hoan-thanh",
    reminder: 10,
    recurrence: "daily",
    tags: ["Cá nhân"],
  },
  {
    id: 16,
    title: "Thanh toán hoá đơn",
    description: "Điện, nước, internet và mặt bằng",
    type: "tai-chinh",
    start: "2024-10-25T09:00:00",
    end: "2024-10-25T09:15:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 1440,
    recurrence: "monthly",
    tags: ["Cá nhân"],
  },
  {
    id: 17,
    title: "Họp Ban Giám Đốc Q4 & Kế hoạch 2024",
    description: "Thống nhất các chỉ số KPI trong tâm cho quý cuối cùng của năm. Xem xét báo cáo doanh thu từ các chi nhánh miền Bắc và miền Nam. Thảo luận về lộ trình chuyển đổi số toàn diện cho hệ thống FocusFlow Pro trong năm 2024.",
    type: "hop-hanh",
    start: "2024-10-15T09:00:00",
    end: "2024-10-15T12:00:00",
    priority: "cao",
    status: "dang-thuc-hien",
    reminder: 15,
    recurrence: "monthly",
    tags: ["Họp-Ban-Giám-Đốc", "Q4-Strategic"],
    participants: ["Ban Giám Đốc"],
  },
  {
    id: 18,
    title: "Review Code Backend Core",
    description: "Review code cho module backend core",
    type: "cong-viec",
    start: "2024-05-24T14:00:00",
    end: "2024-05-24T15:30:00",
    priority: "trung-binh",
    status: "dang-cho",
    reminder: 15,
    recurrence: null,
    tags: ["Công việc"],
    participants: ["Team Leader"],
  },
  {
    id: 19,
    title: "Phỏng vấn ứng viên UI Designer",
    description: "Phỏng vấn ứng viên cho vị trí UI Designer",
    type: "hop-hanh",
    start: "2024-05-25T10:00:00",
    end: "2024-05-25T11:00:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 30,
    recurrence: null,
    tags: ["Công việc"],
    location: "Google Meet",
  },
  {
    id: 20,
    title: "Gửi báo cáo tuần cho khách hàng",
    description: "Tổng hợp và gửi báo cáo tuần",
    type: "cong-viec",
    start: "2024-05-25T14:00:00",
    end: "2024-05-25T15:00:00",
    priority: "trung-binh",
    status: "hoan-thanh",
    tags: ["Công việc"],
  },
  {
    id: 21,
    title: "Họp định kỳ dự án Mobile App",
    description: "Cập nhật tiến độ dự án Mobile App",
    type: "hop-hanh",
    start: "2024-05-24T09:00:00",
    end: "2024-05-24T10:30:00",
    priority: "cao",
    status: "dang-cho",
    reminder: 15,
    recurrence: "weekly",
    tags: ["Công việc"],
    location: "Phòng họp tầng 4",
  },
  {
    id: 22,
    title: "Deep Work (Tập trung cao)",
    description: "Không điện thoại, không thông báo",
    type: "nghien-cuu",
    start: "2024-10-24T08:00:00",
    end: "2024-10-24T09:30:00",
    priority: "trung-binh",
    status: "dang-cho",
    recurrence: null,
    tags: ["Nghiên cứu"],
  },
];

export const mockTags: Tag[] = [
  { id: 1, name: "Công việc", color: "#6750A4", count: 12 },
  { id: 2, name: "Cá nhân", color: "#F2994A", count: 8 },
  { id: 3, name: "Quan trọng", color: "#EB5757", count: 5 },
  { id: 4, name: "Dự án A", color: "#1A1A2E", count: 15 },
  { id: 5, name: "Học tập", color: "#2D9CDB", count: 3 },
  { id: 6, name: "Nghiên cứu", color: "#27AE60", count: 2 },
  { id: 7, name: "Marketing", color: "#9B51E0", count: 4 },
];

export const mockTemplates: Template[] = [
  {
    id: 1,
    title: "Họp Team Tuần",
    description: "Thảo luận tiến độ và giải quyết vướng mắc",
    type: "cong-viec",
    priority: "cao",
    duration: 60,
    reminder: 15,
    tags: ["Công việc"],
  },
  {
    id: 2,
    title: "Tập Thể Dục Sáng",
    description: "Chạy bộ hoặc Cardio tại nhà",
    type: "ca-nhan",
    priority: "trung-binh",
    duration: 45,
    reminder: 10,
    tags: ["Cá nhân"],
  },
  {
    id: 3,
    title: "Viết Báo Cáo Tháng",
    description: "Tổng hợp dữ liệu và đánh giá KPI",
    type: "cong-viec",
    priority: "cao",
    duration: 120,
    reminder: 30,
    tags: ["Công việc"],
  },
  {
    id: 4,
    title: "Thanh Toán Hóa Đơn",
    description: "Điện, nước, internet và mặt bằng",
    type: "tai-chinh",
    priority: "cao",
    duration: 15,
    reminder: 1440,
    tags: ["Tài chính"],
  },
  {
    id: 5,
    title: "Deep Work (Tập trung cao)",
    description: "Không điện thoại, không thông báo",
    type: "nghien-cuu",
    priority: "trung-binh",
    duration: 90,
    tags: ["Nghiên cứu"],
  },
];

export const typeLabels: Record<string, string> = {
  "cong-viec": "Công việc",
  "ca-nhan": "Cá nhân",
  "hop-hanh": "Cuộc họp",
  "hoc-tap": "Học tập",
  "nghien-cuu": "Nghiên cứu",
  "tai-chinh": "Tài chính",
  "marketing": "Marketing",
};

export const typeColors: Record<string, string> = {
  "cong-viec": "#6750A4",
  "ca-nhan": "#F2994A",
  "hop-hanh": "#2D9CDB",
  "hoc-tap": "#27AE60",
  "nghien-cuu": "#9B51E0",
  "tai-chinh": "#EB5757",
  "marketing": "#E91E63",
};

export const priorityLabels: Record<string, string> = {
  cao: "Cao",
  "trung-binh": "Trung bình",
  thap: "Thấp",
};

export const priorityColors: Record<string, string> = {
  cao: "#EB5757",
  "trung-binh": "#F2994A",
  thap: "#27AE60",
};

export const statusLabels: Record<string, string> = {
  "dang-cho": "Đang chờ",
  "dang-thuc-hien": "Đang thực hiện",
  "hoan-thanh": "Hoàn thành",
  "qua-han": "Quá hạn",
};

export const statusColors: Record<string, string> = {
  "dang-cho": "#6750A4",
  "dang-thuc-hien": "#2D9CDB",
  "hoan-thanh": "#27AE60",
  "qua-han": "#EB5757",
};
