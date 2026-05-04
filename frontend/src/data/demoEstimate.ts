/**
 * UI/UX確認用デモ案件データ
 * 職人ダッシュボードで案件が0件のときのみ表示されます。
 * 本番データには一切影響しません。
 */
import type { Estimate } from '../types';

export const DEMO_ESTIMATE: Estimate = {
  id:              9999,
  customer_id:     0,
  customer_name:   '山田 花子',
  craftsman_id:    null,
  work_type:       'both',
  room_name:       '太田市 1LDK 壁紙＋床（クッションフロア）',
  tatami_count:    14,
  condition:       'normal',
  grade:           'standard',
  has_existing_cf: 1,
  auto_min:        80000,
  auto_max:        120000,
  final_price:     null,
  craftsman_note:  null,
  status:          'photo_uploaded',
  photo_filenames: '__demo__',
  created_at:      '2026-04-28T09:00:00.000Z',
};

/** 詳細画面専用：Estimate 型定義外の追加デモ情報 */
export const DEMO_EXTRA = {
  area:       '群馬県太田市',
  rooms:      'リビング・寝室・トイレ',
  workAreas:  '壁・天井・床',
  notes:      '退去後の原状回復。汚れが目立つ壁を優先したい。',
  grade_note: 'スタンダード',
} as const;

/** デモ写真プレースホルダー枚数 */
export const DEMO_PHOTO_COUNT = 2;
