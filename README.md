# 💼 Investment Research Vault

개인 투자 리서치를 위한 Obsidian 볼트입니다.

## 📁 구조

```
├── 0. 대시보드/              # 종합 대시보드
│   ├── 주가스냅샷/           # 자동 생성 주가 데이터
│   └── 주가 대시보드.md      # Dataview 메인 대시보드
├── 1. 기업분석/              # 기업별 상세 분석
│   ├── 1.1 바이오신약/
│   ├── 1.2 진단기기/
│   └── 1.4 산업용기계/
├── scripts/                  # 자동화 스크립트
└── templates/                # 노트 템플릿
```

## 🚀 주요 기능

### 📊 자동 주가 스냅샷
- Yahoo Finance API 연동
- 실시간 주가 + 시가총액 조회
- 1주일/1개월/6개월/1년 수익률 계산

### 📈 투자 대시보드
- Dataview를 활용한 종합 현황
- 목표 시가총액 대비 상승여력 계산
- 기업별 현재가/시총 실시간 업데이트

### 🔄 자동화
- Shell Commands 플러그인으로 원클릭 실행
- Obsidian Git으로 자동 백업

## ⚙️ 설정

### 필수 플러그인
1. **Dataview**: 데이터 집계 및 표시
2. **Shell Commands**: 스크립트 실행  
3. **Obsidian Git**: 자동 백업
4. **Templater**: 템플릿 기능

### 스크립트 설정
```bash
cd scripts
npm install
```

### Shell Commands 설정
- 명령어: `/Users/realyoungk/run-stock-snapshot.sh`
- 단축키 권장: `Cmd+Shift+S`

## 📝 사용법

1. **새 기업 분석**: templates 폴더의 템플릿 사용
2. **주가 업데이트**: Shell Commands로 스냅샷 생성
3. **현황 확인**: 주가 대시보드에서 종합 현황 확인

## 🔒 보안

- API 키나 개인정보는 `.gitignore`로 제외
- 공개해도 안전한 분석 내용만 포함

---

> 📈 투자는 본인 책임입니다. 이 자료는 개인적인 분석 목적입니다.