# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an Obsidian investment research vault that automates stock price tracking for Korean and US stocks. The system generates automated snapshots using Yahoo Finance API and provides real-time investment dashboards using Dataview queries.

## Key Commands

### Stock Snapshot Generation
```bash
# Generate stock price snapshot (run from vault root)
/Users/realyoungk/run-stock-snapshot.sh

# Or directly from scripts directory
cd scripts && node stock-snapshot.js

# Install Node.js dependencies
cd scripts && npm install
```

### Obsidian Shell Commands Setup
- Command name: `📊 주가 스냅샷 생성`
- Shell command: `/Users/realyoungk/run-stock-snapshot.sh`
- Recommended hotkey: `Cmd+Shift+S`

## Architecture Overview

### Core Components

1. **Stock Data Collection (`/scripts/stock-snapshot.js`)**
   - Fetches real-time prices from Yahoo Finance API using `yahoo-finance2` package
   - Supports both Korean markets (.KS/.KQ suffixes) and US markets
   - Calculates returns for 1 week, 1 month, 6 months, and 1 year periods
   - Extracts company metadata from YAML frontmatter (ticker, market, isStudyStock flag)
   - Generates timestamped snapshot files in `0. 대시보드/주가스냅샷/`

2. **Investment Analysis Structure (`/1. 기업분석/`)**
   - Hierarchical organization by industry (바이오, 화장품, 우주항공, 산업용기계)
   - Each company note contains YAML metadata for automated processing:
     - `ticker`: Stock symbol (Korean 6-digit codes or US symbols)
     - `market`: "KS"/"KQ"/"US" 
     - `목표시가총액`: Target market cap
     - `목표시점`: Target timeline
     - `tags`: Including `스터디종목` for priority stocks

3. **Real-time Dashboards (`/0. 대시보드/`)**
   - Main dashboard (`주가 대시보드.md`): Shows all companies with upside calculations
   - Study stocks dashboard (`스터디 종목 대시보드.md`): Filtered view for `#스터디종목` tagged companies
   - Uses DataviewJS to parse latest snapshot data and calculate investment metrics

### Data Flow

1. Company notes contain structured metadata in YAML frontmatter
2. `stock-snapshot.js` scans `1. 기업분석/` folder recursively (excluding templates)
3. Script fetches real-time data from Yahoo Finance and generates markdown snapshots
4. Dataview queries process snapshots to show real-time prices and calculate target upside
5. Study stocks (marked with 🎯 emoji) get special treatment in both snapshots and dashboards

### Key Technical Details

- **Currency Handling**: US stocks show both USD and KRW (₩) with 1330 exchange rate
- **Market Cap Format**: Korean stocks in 조/천억/억, US stocks in $T/$B/$M
- **Study Stock Detection**: Script reads `tags` section in YAML frontmatter for `스터디종목`
- **Path Handling**: Wrapper script (`run-stock-snapshot.sh`) handles spaces in folder names
- **Template System**: Uses Templater plugin with structured templates in `/templates/`

### Required Obsidian Plugins

- **Dataview**: Powers real-time dashboards with JavaScript queries
- **Shell Commands**: Enables automated snapshot generation from within Obsidian  
- **Obsidian Git**: Automated backup and version control
- **Templater**: Template system for new company analysis notes

## Development Notes

- Yahoo Finance API sometimes returns redirect warnings - these are suppressed for valid notices
- Script uses chart API for historical data and quote API for market cap information
- Error handling includes fallback attempts for market cap retrieval using multiple API endpoints
- Decimal precision varies by price range (US stocks <$10 show 2 decimal places)