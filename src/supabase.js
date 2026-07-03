// Supabase 클라이언트 + 전역 사과 카운터 저장/조회.
// item 테이블의 단일 행(id = APPLE_ROW_ID)에 지금까지 주운 사과 총 개수를 보관한다.
import { createClient } from '@supabase/supabase-js'

// 연결 정보는 .env의 VITE_SUPABASE_* 값에서만 읽는다(소스에 하드코딩하지 않음).
// publishable(anon) 키는 RLS로 보호되어 클라이언트 번들에 노출되어도 안전하지만,
// 환경별로 값을 분리하기 위해 환경변수로만 관리한다. (.env.example 참고)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    '[supabase] 환경변수가 설정되지 않았습니다. 프로젝트 루트에 .env를 만들고 ' +
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 지정하세요 (.env.example 참고).'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 전역 사과 카운터는 item 테이블의 단일 행(id = 1)에 저장한다.
const APPLE_ROW_ID = 1

// 저장된 사과 총 개수를 읽어온다. 실패하거나 행이 없으면 null.
export async function loadApples() {
  const { data, error } = await supabase
    .from('item')
    .select('apple_count')
    .eq('id', APPLE_ROW_ID)
    .maybeSingle()
  if (error) {
    console.error('[supabase] 사과 개수 조회 실패:', error.message)
    return null
  }
  return data?.apple_count ?? null
}

// 사과 총 개수를 저장(업서트)한다.
export async function saveApples(count) {
  const { error } = await supabase
    .from('item')
    .upsert({ id: APPLE_ROW_ID, apple_count: count })
  if (error) {
    console.error('[supabase] 사과 개수 저장 실패:', error.message)
  }
}
