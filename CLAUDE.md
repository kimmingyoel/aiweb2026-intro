# aiweb2026-intro — 모세(moses) 소개 페이지

빌드 없는 정적 원페이지 사이트. 미리보기: `.claude/launch.json`의 `intro`(= `python3 -m http.server 4599`).
디자인 시스템은 `../moses-web`(손그림 ink-on-paper)와 공유한다.

## 폰트 — index.html 텍스트 수정 시 반드시 재서브셋

`fonts/MemomentKkukkukk.woff2`는 **index.html에 등장하는 글자만 담은 서브셋**이다
(풀 폰트 5.6MB는 `../moses-web/public/fonts/`에 있음). 페이지의 문구를 수정하면:

```sh
uv run --with fonttools --with brotli subset_font.py
```

를 실행해 서브셋을 재생성해야 한다. 빠뜨리면 새로 등장한 글자만 시스템 폰트로
폴백되어 서체가 섞여 보인다. `.git/hooks/pre-commit`이 index.html 커밋 시 자동으로
재생성·스테이징해 주지만, 프리뷰로 확인하기 전에 직접 실행하는 것이 안전하다.

## 아이콘 스프라이트

index.html 상단의 인라인 `<defs>` 스프라이트는 `python3 build_sprite.py`가 만든
`sprite.html`을 붙여 넣은 것이다. 아이콘 추가 절차:

1. `../moses-web/design_assets/icon/`에서 파일 선택, `build_sprite.py`의 `ICONS`에 등록
2. 브라우저에서 해당 SVG의 전체 path 합집합 `getBBox()`를 측정해 `crops.json`에 추가
3. `python3 build_sprite.py` 실행 후 index.html의 스프라이트 블록을 sprite.html 내용으로 교체

아이콘 stroke 두께는 의도적으로 굵다(`STROKE_RATIO = 0.11`) — 가는 헤어라인으로 만들지 말 것.

## giscus 커스텀 테마

댓글 위젯의 스타일은 `giscus-theme.css`가 담당한다 — 공식 `noborder_light` 테마의
변수 구조를 그대로 두고 색만 그레이 팔레트로 치환한 파일이며, index.html의
`data-theme`이 배포 URL(`https://s03.aiweb2026.site/giscus-theme.css?v=...`)로 가리킨다.

- giscus iframe이 교차 출처로 가져가므로 **배포된 후에만 적용된다**(CORS `*`는 호스트에
  이미 설정돼 있음). 로컬 프리뷰에서는 배포본 테마가 로드되므로, 테마 수정 직후의
  로컬 확인은 임시로 CORS 헤더를 켠 별도 서버 + `data-theme` 임시 교체로 한다.
- 테마를 수정하면 `data-theme`의 `?v=` 쿼리를 갱신한다(스타일시트 캐시 무효화).
- 댓글 위젯 안에는 Memoment 폰트를 쓰지 않는다 — 방문자가 쓰는 임의의 글자는
  서브셋에 없어 서체가 섞여 보인다. 시스템 산세리프를 유지할 것.

## 디자인 규칙

- 그레이 팔레트만 사용: #262626(ink) / #666666(graphite) / #9E9E9E(ash) / #F5F5F5(paper) / #FFFFFF.
- 텍스트 옆에 붙는 leading 아이콘은 색을 따로 지정하지 않는다 — `currentColor`로 텍스트 색을 상속시킨다.
- 기울기(rotate)는 장식 요소(히어로 두들, 테이프, 스크린샷 사진, 캡션)에만 쓴다.
  콘텐츠 블록·카드·칩·타이틀에는 적용하지 않는다.
- `style.css`를 수정하면 index.html의 `<link href="style.css?v=...">` 버전 쿼리를 갱신한다(캐시 무효화).
