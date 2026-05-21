import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageUtils';
import { fetchRequestDetail, RequestNotFoundError } from '../../utils/requestApi';

// ── 後方互換型（他ファイルが import している可能性があるため保持）──────────────

export type RoomInfo = {
  name: string; workType: string; size: string;
  condition: string[]; furniture: string; memo: string;
};
export type ExtraInfo = {
  furniture: string; parking: string; material: string[];
  condition: string[]; timing: string; memo: string;
  roomCount: string; rooms: RoomInfo[]; attachmentFlags: string[];
};

// ── 型 ────────────────────────────────────────────────────────────────────────

type RawRoom = {
  name?: string; customName?: string; workType?: string;
  wallWorkScope?: string; floorWork?: string; size?: string; customSize?: string;
};

type RoomAdditionalEntry = {
  roomName:        string;
  workType?:       string;
  productNumber?:  string;
  note?:           string;
  photos?:         string[];
  videoUrl?:       string;
  addedByCustomer?: boolean;
};

type RoomAdditionalInfo = Record<string, RoomAdditionalEntry>;

type PerRoomState = {
  productNumber:  string;
  note:           string;
  photos:         string[];   // 保存済み publicUrl のみ（Storage にある）
  previewUrls:    string[];   // アップロード中の blob URL（即時プレビュー用・保存しない）
  videoUrl:       string;
  uploading:      boolean;    // 写真アップロード中フラグ
  videoUploading: boolean;
  uploadError:    string;     // 写真アップロードエラーメッセージ（''=なし）
};

type AddedRoom = {
  name:     string;
  workType: string;
  note:     string;
};

// ── 選択肢 ────────────────────────────────────────────────────────────────────

const ADDED_ROOM_NAMES    = ['洋室', '寝室', 'LDK', 'ダイニング', 'トイレ', '廊下', '玄関', 'その他'] as const;
const ADDED_ROOM_WORKS    = ['クロス', '床CF', '両方', 'まだ未定'] as const;
const FURNITURE_OPTIONS   = ['家具はほとんどない', '自分で動かせる家具がある', '一部は自分で動かせる', '大きな家具があり自分では動かせない', '不明'] as const;
const PARKING_OPTIONS     = ['あり', '近くにコインパーキングあり', 'なし', '不明'] as const;
const MATERIAL_OPTIONS    = ['量産クロス', '1000番クロス', 'クッションフロア', '職人に相談したい', '未定'] as const;
const VIDEO_SIZE_LIMIT_MB = 50;

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 px-5 py-4">
      <p className="text-xs font-bold text-slate-600 mb-3">{label}</p>
      {children}
    </div>
  );
}

function ChipSingle({ options, value, onSelect }: { options: readonly string[]; value: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onSelect(opt === value ? '' : opt)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            value === opt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChipMulti({ options, selected, onToggle }: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
            selected.includes(opt) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function getRoomDisplayName(r: RawRoom, i: number) {
  return r.customName || r.name || `部屋${i + 1}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RequestExtraInfoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDemo = !id || id.startsWith('demo');

  // 基本データ
  const [existingRooms,   setExistingRooms]   = useState<RawRoom[]>([]);
  const [hasMainVideo,    setHasMainVideo]     = useState(false);
  const [loading,         setLoading]          = useState(true);
  const [loadError,       setLoadError]        = useState('');

  // 部屋別追加データ（key = '0', '1', ... for existing; 'added_0', ... for new）
  const [perRoom,  setPerRoom]  = useState<Record<string, PerRoomState>>({});

  // 追加部屋
  const [addedRooms,    setAddedRooms]    = useState<AddedRoom[]>([]);
  const [showAddRoom,   setShowAddRoom]   = useState(false);
  const [newRoom,       setNewRoom]       = useState<AddedRoom>({ name: '', workType: '', note: '' });

  // 詳細オプション
  const [accentPref,   setAccentPref]   = useState('');
  const [sokibariPref, setSokibariPref] = useState('');
  const [furniture,    setFurniture]    = useState('');
  const [parking,      setParking]      = useState('');
  const [material,     setMaterial]     = useState<string[]>([]);
  const [showDetail,   setShowDetail]   = useState(false);

  // 保存状態
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── ロード ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !id) {
      setExistingRooms([{ name: 'メインのお部屋', customName: 'メインのお部屋' }]);
      setPerRoom({ '0': { productNumber: '', note: '', photos: [], previewUrls: [], videoUrl: '', uploading: false, videoUploading: false, uploadError: '' } });
      setLoading(false);
      return;
    }

    fetchRequestDetail(id)
      .then(data => {
        const meta = data.meta ?? {};
        const rawRooms = (meta.rooms as RawRoom[] | undefined) ?? [];
        const rooms: RawRoom[] = rawRooms.length > 0 ? rawRooms : [{ name: 'メインのお部屋' }];
        setExistingRooms(rooms);
        // has_video列は本番DBに存在しない → video_url の non-null で代用
        setHasMainVideo(data.video_url !== null && data.video_url !== undefined && data.video_url !== '');

        // 既存 roomAdditionalInfo からプリセット
        const existingRAI = (meta.roomAdditionalInfo as RoomAdditionalInfo | null) ?? {};

        const initPerRoom: Record<string, PerRoomState> = {};
        rooms.forEach((_, i) => {
          const key = String(i);
          const e = existingRAI[key];
          initPerRoom[key] = {
            productNumber:  e?.productNumber ?? '',
            note:           e?.note ?? '',
            photos:         e?.photos ?? [],
            previewUrls:    [],
            videoUrl:       e?.videoUrl ?? '',
            uploading:      false,
            videoUploading: false,
            uploadError:    '',
          };
        });

        // 既存追加部屋
        const addedEntries = Object.entries(existingRAI)
          .filter(([k]) => k.startsWith('added_'))
          .map(([, v]) => ({
            name:     (v as RoomAdditionalEntry).roomName ?? '',
            workType: (v as RoomAdditionalEntry).workType ?? '',
            note:     (v as RoomAdditionalEntry).note ?? '',
          }));
        if (addedEntries.length > 0) {
          setAddedRooms(addedEntries);
          addedEntries.forEach((_, i) => {
            const key = `added_${i}`;
            const e = existingRAI[key];
            initPerRoom[key] = {
              productNumber:  e?.productNumber ?? '',
              note:           e?.note ?? '',
              photos:         e?.photos ?? [],
              previewUrls:    [],
              videoUrl:       e?.videoUrl ?? '',
              uploading:      false,
              videoUploading: false,
              uploadError:    '',
            };
          });
        }

        setPerRoom(initPerRoom);

        // 既存 extraInfo プリセット
        const ei = meta.extraInfo as Record<string, unknown> | null;
        if (ei) {
          setAccentPref(String(ei.accentPreference ?? ''));
          setSokibariPref(String(ei.softSokibariPreference ?? ''));
        }
        const leg = meta.extra_info as Record<string, unknown> | null;
        if (leg) {
          setFurniture(String(leg.furniture ?? ''));
          setParking(String(leg.parking ?? ''));
          setMaterial((leg.material as string[]) ?? []);
        }

        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '依頼情報の読み込みに失敗しました';
        console.warn('[ExtraInfo] request detail fetch failed', { id, error: err });
        setLoadError(msg);
        setLoading(false);
      });
  }, [id, isDemo]);

  // ── 写真アップロード（部屋別）────────────────────────────────────────────────
  // /api/upload-room-image 経由で service role key を使って Storage RLS をバイパスする。
  // 圧縮は必須（compressImage が throw した場合はエラー表示・silent fallback なし）。
  async function handlePhotoUpload(roomKey: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    const cur = perRoom[roomKey];
    const existingCount = (cur?.photos.length ?? 0) + (cur?.previewUrls.length ?? 0);
    const fileArr = Array.from(files).slice(0, Math.max(0, 5 - existingCount));
    if (fileArr.length === 0) return;

    // 即座にプレビュー表示（blob URL）
    const blobUrls = fileArr.map(f => URL.createObjectURL(f));
    setPerRoom(prev => ({
      ...prev,
      [roomKey]: {
        ...prev[roomKey],
        previewUrls: [...(prev[roomKey]?.previewUrls ?? []), ...blobUrls],
        uploading:   true,
        uploadError: '',
      },
    }));

    // バックグラウンドでアップロード・publicUrl への差し替え
    const successMap: Record<string, string> = {};  // blobUrl → publicUrl
    const failedBlobUrls: string[] = [];

    for (let i = 0; i < fileArr.length; i++) {
      const file    = fileArr[i];
      const blobUrl = blobUrls[i];
      try {
        // 圧縮必須（失敗時は throw → silent fallback なし）
        const blob = await compressImage(file, 1200, 0.80);

        // base64 変換
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] ?? '');
          };
          reader.onerror = () => reject(new Error('base64 変換に失敗しました'));
          reader.readAsDataURL(blob);
        });

        // /api/upload-room-image 経由でアップロード（service role → Storage RLS バイパス）
        const apiRes = await fetch('/api/upload-room-image', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            id:       id ?? 'anon',
            roomKey,
            base64,
            mimeType: blob.type,
          }),
        });

        if (!apiRes.ok) {
          const errBody = await apiRes.json().catch(() => ({ error: 'upload failed' }));
          console.warn('[ExtraInfo] photo upload API error:', apiRes.status, errBody);
          failedBlobUrls.push(blobUrl);
          continue;
        }

        const { publicUrl } = await apiRes.json() as { publicUrl: string };
        successMap[blobUrl] = publicUrl;

      } catch (e) {
        console.warn('[ExtraInfo] photo upload exception:', e);
        failedBlobUrls.push(blobUrl);
      }
    }

    // blob URL を publicUrl に差し替え（成功・失敗とも previewUrls から除去）
    setPerRoom(prev => {
      const d = prev[roomKey];
      if (!d) return prev;
      const uploadedBlobSet = new Set(blobUrls);
      const newPreviews = d.previewUrls.filter(u => !uploadedBlobSet.has(u));
      const newPublic   = [...d.photos, ...Object.values(successMap)].slice(0, 5);
      const errorMsg    = failedBlobUrls.length > 0
        ? `${failedBlobUrls.length}枚の写真でエラーが発生しました。再度お試しください。`
        : '';
      return {
        ...prev,
        [roomKey]: { ...d, photos: newPublic, previewUrls: newPreviews, uploading: false, uploadError: errorMsg },
      };
    });
  }

  // ── 動画アップロード（部屋別）────────────────────────────────────────────────
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleVideoUpload(roomKey: string, file: File | null) {
    if (!file) return;

    if (file.size > VIDEO_SIZE_LIMIT_MB * 1024 * 1024) {
      alert(`動画ファイルは${VIDEO_SIZE_LIMIT_MB}MB以下にしてください`);
      return;
    }

    setPerRoom(prev => ({ ...prev, [roomKey]: { ...prev[roomKey], videoUploading: true } }));

    try {
      const ext  = file.name.split('.').pop() ?? 'mp4';
      const path = `room-videos/${id ?? 'anon'}/${roomKey}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('estimate-videos').upload(path, file, { contentType: file.type });
      if (error) {
        console.warn('[ExtraInfo] video upload error:', error.message);
        setPerRoom(prev => ({ ...prev, [roomKey]: { ...prev[roomKey], videoUploading: false } }));
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('estimate-videos').getPublicUrl(path);
      setPerRoom(prev => ({
        ...prev,
        [roomKey]: { ...prev[roomKey], videoUrl: publicUrl, videoUploading: false },
      }));
    } catch {
      setPerRoom(prev => ({ ...prev, [roomKey]: { ...prev[roomKey], videoUploading: false } }));
    }
  }

  // ── 保存 ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!id || isDemo) {
      navigate('/');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      // roomAdditionalInfo を組み立て
      const roomAdditionalInfo: RoomAdditionalInfo = {};

      existingRooms.forEach((room, i) => {
        const key = String(i);
        const d = perRoom[key];
        if (!d) return;
        const entry: RoomAdditionalEntry = {
          roomName: getRoomDisplayName(room, i),
        };
        if (d.productNumber.trim()) entry.productNumber = d.productNumber.trim();
        if (d.note.trim())          entry.note          = d.note.trim();
        if (d.photos.length > 0)    entry.photos        = d.photos;
        if (d.videoUrl)             entry.videoUrl      = d.videoUrl;
        roomAdditionalInfo[key] = entry;
      });

      addedRooms.forEach((r, i) => {
        const key = `added_${i}`;
        const d = perRoom[key];
        const entry: RoomAdditionalEntry = {
          roomName:        r.name || `追加部屋${i + 1}`,
          workType:        r.workType || undefined,
          note:            r.note || undefined,
          addedByCustomer: true,
        };
        if (d?.photos?.length)  entry.photos   = d.photos;
        if (d?.videoUrl)        entry.videoUrl = d.videoUrl;
        roomAdditionalInfo[key] = entry;
      });

      const metaUpdate: Record<string, unknown> = {
        roomAdditionalInfo,
      };

      const extraInfo: Record<string, unknown> = {};
      if (accentPref)   extraInfo.accentPreference       = accentPref;
      if (sokibariPref) extraInfo.softSokibariPreference = sokibariPref;
      if (Object.keys(extraInfo).length > 0) metaUpdate.extraInfo = extraInfo;

      const extra_info: Record<string, unknown> = {};
      if (furniture)           extra_info.furniture = furniture;
      if (parking)             extra_info.parking   = parking;
      if (material.length > 0) extra_info.material  = material;
      if (Object.keys(extra_info).length > 0) metaUpdate.extra_info = extra_info;

      const response = await fetch('/api/request-meta', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, metaUpdate }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '保存に失敗しました' }));
        setSaveError(err.error ?? '保存に失敗しました');
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaveSuccess(true);

      // 少し待ってから遷移（保存完了メッセージを見せる）
      setTimeout(() => navigate(`/request/${id}`), 1000);

    } catch {
      setSaveError('保存に失敗しました。もう一度お試しください。');
      setSaving(false);
    }
  }

  // ── ローディング ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (loadError && !isDemo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <p className="text-base font-extrabold text-slate-800 mb-1">依頼情報を読み込めませんでした</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            時間をおいてもう一度お試しください。<br />
            繰り返し発生する場合はお問い合わせください。
          </p>
          {loadError !== '依頼情報の読み込みに失敗しました' && (
            <p className="text-[10px] text-slate-400 mt-2">{loadError}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={() => navigate(`/request/${id}`)}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition active:scale-95"
          >
            依頼状況ページへ
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-white transition"
          >
            再読み込みする
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-400 font-semibold text-sm hover:bg-white transition"
          >
            トップへ戻る
          </button>
        </div>
      </div>
    );
  }

  // ── フォーム ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ── ヘッダー ── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(id && !isDemo ? `/request/${id}` : '/')}
          className="text-slate-400 hover:text-slate-700 p-1 -ml-1 rounded-xl transition"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-extrabold text-slate-900 leading-tight">追加情報を送る</h1>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">分かる範囲だけで大丈夫です</p>
        </div>
        <button
          onClick={() => navigate(id && !isDemo ? `/request/${id}` : '/')}
          className="text-xs text-slate-400 font-semibold flex-shrink-0 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
        >
          スキップ
        </button>
      </header>

      {/* ── 3タブナビゲーション ── */}
      {id && !isDemo && (
        <nav className="bg-white border-b border-slate-200">
          <div className="flex max-w-lg mx-auto">
            <button
              onClick={() => navigate(`/request/${id}`)}
              className="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition"
            >
              依頼内容
            </button>
            <button
              onClick={() => navigate(`/request/${id}/applications`)}
              className="flex-1 py-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition"
            >
              応募状況
            </button>
            <div className="flex-1 py-3 text-xs font-bold border-b-2 border-blue-600 text-blue-600 text-center">
              追加情報
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {isDemo && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold text-amber-700">📋 デモモード — 実際には保存されません</p>
          </div>
        )}

        {/* 導入テキスト */}
        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-blue-700 mb-1">写真・品番・メモを追加すると職人が判断しやすくなります</p>
          <p className="text-[11px] text-blue-600 leading-relaxed">
            すでに依頼は完了しています。部屋ごとに追加できます。
          </p>
        </div>

        {/* ── 部屋別カード（Phase 3・4）── */}
        {existingRooms.map((room, roomIdx) => {
          const roomKey = String(roomIdx);
          const d = perRoom[roomKey] ?? { productNumber: '', note: '', photos: [], previewUrls: [], videoUrl: '', uploading: false, videoUploading: false, uploadError: '' };
          const displayName = getRoomDisplayName(room, roomIdx);
          const isFirstRoom = roomIdx === 0;

          return (
            <div key={roomIdx} className="bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden">
              {/* 部屋ヘッダー */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <span className="text-base">🏠</span>
                <p className="text-sm font-extrabold text-white">{displayName}</p>
                {isFirstRoom && hasMainVideo && (
                  <span className="ml-auto text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                    🎬 メイン動画あり
                  </span>
                )}
              </div>

              <div className="px-4 py-4 space-y-4">

                {/* 写真追加 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-2">
                    📸 写真
                    <span className="ml-1 text-slate-300 font-normal">壁・床の状態、気になる箇所など（最大5枚）</span>
                  </p>

                  {(d.photos.length + d.previewUrls.length) < 5 && (
                    <label className={`flex items-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all ${
                      d.uploading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-300 hover:bg-blue-50'} border-slate-200`}>
                      <span className="text-lg">{d.uploading ? '⏳' : '📷'}</span>
                      <p className="text-xs font-bold text-slate-500">
                        {d.uploading ? 'アップロード中...' : '写真を選択（複数可）'}
                      </p>
                      <input type="file" accept="image/*" multiple className="hidden"
                        disabled={d.uploading}
                        onChange={e => handlePhotoUpload(roomKey, e.target.files)} />
                    </label>
                  )}

                  {/* 即時プレビュー（blob URL）+ 保存済み（publicUrl）を両方表示 */}
                  {(d.previewUrls.length + d.photos.length) > 0 && (
                    <>
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {d.previewUrls.map((url, i) => (
                          <div key={`prev-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                            <img src={url} alt={`プレビュー${i + 1}`} className="w-full h-full object-cover" />
                            {/* アップロード中インジケーター（uploading:true のときのみ表示）*/}
                            {d.uploading && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        ))}
                        {d.photos.map((url, i) => (
                          <div key={`photo-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                            <img src={url} alt={`写真${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">✓</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold mt-1">
                        {d.uploading
                          ? <span className="text-blue-600">📤 アップロード中...</span>
                          : <span className="text-emerald-600">✓ 写真を追加しました（{d.photos.length}枚）</span>
                        }
                      </p>
                    </>
                  )}
                  {/* アップロードエラー表示 */}
                  {d.uploadError && (
                    <div className="mt-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                      <p className="text-[11px] font-bold text-red-600">⚠️ {d.uploadError}</p>
                    </div>
                  )}
                </div>

                {/* 動画追加（Phase 4）*/}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-2">
                    🎬 動画
                    <span className="ml-1 text-slate-300 font-normal">{VIDEO_SIZE_LIMIT_MB}MB以下・10〜15秒推奨</span>
                  </p>

                  {d.videoUrl ? (
                    <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2">
                      <span className="text-base">🎬</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-700">動画を追加しました</p>
                        <video src={d.videoUrl} controls playsInline preload="none"
                          className="w-full rounded-lg bg-slate-900 mt-1" style={{ maxHeight: '120px' }} />
                      </div>
                    </div>
                  ) : d.videoUploading ? (
                    <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full flex-shrink-0" />
                      <p className="text-xs font-bold text-blue-600">動画アップロード中...</p>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 border-slate-200 transition-all">
                      <span className="text-lg">🎥</span>
                      <p className="text-xs font-bold text-slate-500">動画を追加する</p>
                      <input type="file" accept="video/*" className="hidden"
                        ref={el => { videoInputRefs.current[roomKey] = el; }}
                        onChange={e => handleVideoUpload(roomKey, e.target.files?.[0] ?? null)} />
                    </label>
                  )}
                </div>

                {/* 品番 */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5">
                    🏷 クロス品番
                    <span className="ml-1 text-slate-300 font-normal">例：BB-8503、SP2816</span>
                  </p>
                  <input
                    value={d.productNumber}
                    onChange={e => setPerRoom(prev => ({ ...prev, [roomKey]: { ...prev[roomKey], productNumber: e.target.value } }))}
                    placeholder="品番を入力（分からなければ空白でOK）"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                {/* メモ */}
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5">📝 職人へのメモ</p>
                  <textarea
                    value={d.note}
                    onChange={e => setPerRoom(prev => ({ ...prev, [roomKey]: { ...prev[roomKey], note: e.target.value } }))}
                    rows={2}
                    placeholder="例：窓の下が汚れている、北欧系の雰囲気にしたい など"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>

              </div>
            </div>
          );
        })}

        {/* ── 追加部屋（Phase 5）── */}
        {addedRooms.map((r, i) => {
          const roomKey = `added_${i}`;
          const d = perRoom[roomKey] ?? { productNumber: '', note: '', photos: [], previewUrls: [], videoUrl: '', uploading: false, videoUploading: false, uploadError: '' };
          return (
            <div key={roomKey} className="bg-white rounded-2xl ring-1 ring-violet-200 overflow-hidden">
              <div className="bg-violet-700 px-4 py-3 flex items-center gap-2">
                <span className="text-base">➕</span>
                <p className="text-sm font-extrabold text-white">{r.name || `追加部屋${i + 1}`}</p>
                <span className="ml-auto text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">追加された部屋</span>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>工事内容：{r.workType || '未定'}</span>
                  <button type="button" onClick={() => {
                    setAddedRooms(prev => prev.filter((_, j) => j !== i));
                    setPerRoom(prev => { const n = { ...prev }; delete n[roomKey]; return n; });
                  }} className="text-red-400 text-xs font-semibold">削除</button>
                </div>
                {r.note && <p className="text-xs text-slate-500 leading-relaxed">{r.note}</p>}
                {/* 写真 */}
                {(d.photos.length + d.previewUrls.length) < 5 && (
                  <label className={`flex items-center gap-2 border-2 border-dashed rounded-xl px-3 py-2 cursor-pointer transition-all ${
                    d.uploading ? 'opacity-50 pointer-events-none' : 'hover:border-violet-300 hover:bg-violet-50'} border-slate-200`}>
                    <span>{d.uploading ? '⏳' : '📷'}</span>
                    <p className="text-xs text-slate-400 font-semibold">{d.uploading ? 'アップロード中...' : '写真を追加'}</p>
                    <input type="file" accept="image/*" multiple className="hidden" disabled={d.uploading}
                      onChange={e => handlePhotoUpload(roomKey, e.target.files)} />
                  </label>
                )}
                {(d.previewUrls.length + d.photos.length) > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {d.previewUrls.map((url, j) => (
                      <div key={`prev-${j}`} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                        <img src={url} alt={`プレビュー${j + 1}`} className="w-full h-full object-cover" />
                        {d.uploading && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    ))}
                    {d.photos.map((url, j) => (
                      <img key={`photo-${j}`} src={url} alt={`写真${j + 1}`} className="w-full aspect-square object-cover rounded-xl border border-slate-100" loading="lazy" />
                    ))}
                  </div>
                )}
                {d.uploadError && (
                  <div className="mt-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                    <p className="text-[11px] font-bold text-red-600">⚠️ {d.uploadError}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── 部屋追加ボタン・フォーム（Phase 5）── */}
        {!showAddRoom ? (
          <button type="button"
            onClick={() => setShowAddRoom(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-300 text-violet-600 font-bold text-sm hover:bg-violet-50 flex items-center justify-center gap-2 transition-all">
            ＋ 部屋を追加する
          </button>
        ) : (
          <div className="bg-white rounded-2xl ring-1 ring-violet-200 px-4 py-4 space-y-3">
            <p className="text-xs font-bold text-violet-700 mb-2">＋ 追加する部屋の情報</p>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">部屋名</p>
              <ChipSingle options={ADDED_ROOM_NAMES} value={newRoom.name}
                onSelect={v => setNewRoom(prev => ({ ...prev, name: v }))} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">工事内容</p>
              <ChipSingle options={ADDED_ROOM_WORKS} value={newRoom.workType}
                onSelect={v => setNewRoom(prev => ({ ...prev, workType: v }))} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">メモ（任意）</p>
              <input value={newRoom.note}
                onChange={e => setNewRoom(prev => ({ ...prev, note: e.target.value }))}
                placeholder="例：北側の洋室、約8畳"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => {
                  const i = addedRooms.length;
                  const key = `added_${i}`;
                  setAddedRooms(prev => [...prev, { ...newRoom }]);
                  setPerRoom(prev => ({ ...prev, [key]: { productNumber: '', note: '', photos: [], previewUrls: [], videoUrl: '', uploading: false, videoUploading: false, uploadError: '' } }));
                  setNewRoom({ name: '', workType: '', note: '' });
                  setShowAddRoom(false);
                }}
                disabled={!newRoom.name}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm disabled:opacity-40">
                追加する
              </button>
              <button type="button"
                onClick={() => { setShowAddRoom(false); setNewRoom({ name: '', workType: '', note: '' }); }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ── 詳細トグル ── */}
        <button type="button"
          onClick={() => setShowDetail(v => !v)}
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white flex items-center justify-center gap-2 transition-all">
          {showDetail ? '▲ 閉じる' : '▼ 詳しく入力する（家具・材料・アクセントなど）'}
        </button>

        {showDetail && (
          <>
            <Section label="✨ アクセントクロス（任意）">
              <ChipSingle options={['希望あり', '希望なし', 'まだ決まっていない']} value={accentPref} onSelect={setAccentPref} />
            </Section>
            <Section label="📐 ソフト巾木の施工（任意）">
              <ChipSingle options={['施工希望', '不要', 'まだ決まっていない']} value={sokibariPref} onSelect={setSokibariPref} />
            </Section>
            <Section label="家具の移動（任意）">
              <ChipSingle options={FURNITURE_OPTIONS} value={furniture} onSelect={setFurniture} />
            </Section>
            <Section label="駐車場（任意）">
              <ChipSingle options={PARKING_OPTIONS} value={parking} onSelect={setParking} />
            </Section>
            <Section label="材料の希望（任意・複数可）">
              <ChipMulti options={MATERIAL_OPTIONS} selected={material}
                onToggle={v => setMaterial(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} />
            </Section>
          </>
        )}

        {/* エラー */}
        {saveError && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-sm text-red-600 font-bold">{saveError}</p>
          </div>
        )}

        {/* 保存成功 */}
        {saveSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
            <span className="text-base">✅</span>
            <p className="text-sm text-emerald-700 font-bold">保存しました！依頼状況ページへ移動します...</p>
          </div>
        )}

        {/* ── 送信ボタン ── */}
        <button
          onClick={handleSave}
          disabled={saving || saveSuccess || (!id && !isDemo)}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-base transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? '保存中...' : '追加情報を送る'}
        </button>

        <button
          onClick={() => navigate(id && !isDemo ? `/request/${id}` : '/')}
          className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-white transition-all"
        >
          今はスキップする
        </button>

        <p className="text-center text-[10px] text-slate-400 leading-relaxed px-2">
          ※ 個人情報（電話番号・住所等）は入力しないでください。成約後に別途メールにてご案内します。
        </p>

      </div>
    </div>
  );
}
