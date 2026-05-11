// 'admin' は運営アカウント用。Supabase user_metadata.role='admin' で識別する。
// customer / craftsman の判定ロジック (role === 'customer' / role === 'craftsman') には
// 影響を与えない設計。
export type Role = 'customer' | 'craftsman' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type WorkType = 'cross' | 'cf' | 'both';
export type Condition = 'good' | 'normal' | 'bad';
export type Grade = 'economy' | 'standard' | 'premium';
export type EstimateStatus = 'pending' | 'photo_uploaded' | 'reviewing' | 'confirmed' | 'rejected' | 'booked';

export interface Estimate {
  id: number;
  customer_id: number;
  customer_name: string;
  craftsman_id: number | null;
  work_type: WorkType;
  room_name: string;
  tatami_count: number;
  condition: Condition;
  grade: Grade;
  has_existing_cf: number;
  auto_min: number;
  auto_max: number;
  final_price: number | null;
  craftsman_note: string | null;
  status: EstimateStatus;
  photo_filenames: string | null;
  created_at: string;
}
