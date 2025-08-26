const fs = require('fs');
const path = require('path');
const yahooFinance = require('yahoo-finance2').default;

const VAULT_PATH = '/Users/realyoungk/Library/Mobile Documents/com~apple~CloudDocs/obsidian/realyoungk\'s volt';
const COMPANIES_PATH = path.join(VAULT_PATH, '1. 기업분석');
const SNAPSHOTS_PATH = path.join(VAULT_PATH, '0. 대시보드', '주가스냅샷');

// 날짜 계산 함수
function getTargetDates() {
    const now = new Date();
    const today = new Date(now);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    return {
        today,
        weekAgo,
        monthAgo,
        sixMonthsAgo,
        yearAgo
    };
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function formatDateKR(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

// 기업 정보 추출
function extractCompanyInfo(content) {
    const lines = content.split('\n');
    let ticker = '';
    let companyName = '';
    let market = 'KS'; // 기본값 코스피
    
    // YAML frontmatter에서 ticker 추출
    let inFrontmatter = false;
    for (const line of lines) {
        if (line.trim() === '---') {
            if (!inFrontmatter) {
                inFrontmatter = true;
            } else {
                break;
            }
        }
        if (inFrontmatter) {
            if (line.startsWith('ticker:')) {
                ticker = line.split(':')[1].trim().replace(/['"]/g, '');
            }
            if (line.startsWith('market:')) {
                market = line.split(':')[1].trim().replace(/['"]/g, '');
            }
        }
    }
    
    // 제목에서 기업명 추출
    for (const line of lines) {
        if (line.startsWith('# ') && line.includes('기업분석')) {
            companyName = line.replace('# ', '').replace('기업분석', '').trim();
            break;
        }
    }
    
    return { ticker, companyName, market };
}

// 모든 기업 파일 찾기
function findAllCompanies(dir) {
    const companies = [];
    
    function searchDir(currentPath) {
        // templates 폴더는 스킵
        if (currentPath.includes('/templates') || currentPath.includes('\\templates')) {
            return;
        }
        
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                searchDir(fullPath);
            } else if (item.endsWith('.md')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const { ticker, companyName, market } = extractCompanyInfo(content);
                if (ticker && companyName) {
                    companies.push({ 
                        ticker, 
                        companyName, 
                        market,
                        filePath: fullPath 
                    });
                }
            }
        }
    }
    
    searchDir(dir);
    
    // 분류가 필요한 노트 폴더도 확인 (templates 제외)
    const unclassifiedPath = path.join(VAULT_PATH, '분류가 필요한 노트');
    if (fs.existsSync(unclassifiedPath)) {
        searchDir(unclassifiedPath);
    }
    
    return companies;
}

// Yahoo Finance를 통한 주가 조회
async function getStockPrices(ticker, market) {
    try {
        // 경고 메시지 억제
        yahooFinance.suppressNotices(['ripHistorical']);
        
        // 한국 주식의 경우 .KS(코스피) 또는 .KQ(코스닥) 접미사 추가
        const symbol = `${ticker}.${market}`;
        const dates = getTargetDates();
        
        // chart API 사용 (새로운 방식)
        const queryOptions = {
            period1: dates.yearAgo,
            period2: dates.today,
            interval: '1d',
            return: 'array'
        };
        
        const result = await yahooFinance.chart(symbol, queryOptions);
        
        // quotes 배열 추출
        const quotes = result.quotes || result;
        
        if (!quotes || quotes.length === 0) {
            throw new Error('No data available');
        }
        
        // 각 시점에 가장 가까운 데이터 찾기
        const findClosestPrice = (targetDate) => {
            let closest = quotes[0];
            let minDiff = Math.abs(quotes[0].date.getTime() - targetDate.getTime());
            
            for (const data of quotes) {
                const diff = Math.abs(data.date.getTime() - targetDate.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = data;
                }
            }
            return closest.close;
        };
        
        // 시가총액 정보 조회 시도 (여러 방법)
        let marketCapInfo = "N/A";
        
        try {
            // 방법 1: quote API 사용
            const quoteData = await yahooFinance.quote(symbol);
            if (quoteData && quoteData.marketCap) {
                const marketCap = quoteData.marketCap;
                if (marketCap > 1000000000000) { // 1조 이상
                    marketCapInfo = (marketCap / 1000000000000).toFixed(1) + "조";
                } else if (marketCap > 100000000000) { // 1000억 이상
                    marketCapInfo = Math.round(marketCap / 100000000000) + "천억";
                } else if (marketCap > 100000000) { // 1억 이상
                    marketCapInfo = Math.round(marketCap / 100000000) + "억";
                }
            }
        } catch (error) {
            console.log(`quote API 시가총액 조회 실패 (${symbol}):`, error.message);
        }
        
        // 방법 2: quoteSummary API (리다이렉션 문제 무시하고 시도)
        if (marketCapInfo === "N/A") {
            try {
                const summaryData = await yahooFinance.quoteSummary(symbol, {
                    modules: ['price', 'defaultKeyStatistics']
                });
                
                if (summaryData && summaryData.price && summaryData.price.marketCap) {
                    const marketCap = summaryData.price.marketCap;
                    if (marketCap > 1000000000000) {
                        marketCapInfo = (marketCap / 1000000000000).toFixed(1) + "조";
                    } else if (marketCap > 100000000000) {
                        marketCapInfo = Math.round(marketCap / 100000000000) + "천억";
                    } else if (marketCap > 100000000) {
                        marketCapInfo = Math.round(marketCap / 100000000) + "억";
                    }
                }
            } catch (error) {
                console.log(`quoteSummary 시가총액 조회 실패 (${symbol}):`, error.message);
            }
        }

        return {
            today: findClosestPrice(dates.today),
            weekAgo: findClosestPrice(dates.weekAgo),
            monthAgo: findClosestPrice(dates.monthAgo),
            sixMonthsAgo: findClosestPrice(dates.sixMonthsAgo),
            yearAgo: findClosestPrice(dates.yearAgo),
            marketCap: marketCapInfo
        };
        
    } catch (error) {
        console.error(`Error fetching ${ticker}.${market}:`, error.message);
        // 에러 발생시 null 반환
        return null;
    }
}

// 스냅샷 노트 생성
async function createSnapshot() {
    const now = new Date();
    const timestamp = `${formatDateKR(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `주가스냅샷_${formatDate(now)}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.md`;
    
    // 스냅샷 폴더 생성
    if (!fs.existsSync(SNAPSHOTS_PATH)) {
        fs.mkdirSync(SNAPSHOTS_PATH, { recursive: true });
    }
    
    const companies = findAllCompanies(COMPANIES_PATH);
    
    let content = `---
created: ${timestamp}
type: stock-snapshot
tags:
  - 주가스냅샷
  - 자동생성
---

# 주가 스냅샷 - ${timestamp}

> 생성 시각: ${timestamp}
> 총 ${companies.length}개 기업

`;
    
    for (const company of companies) {
        console.log(`${company.companyName} (${company.ticker}) 주가 조회 중...`);
        
        const prices = await getStockPrices(company.ticker, company.market);
        
        if (prices && prices.today !== null && prices.today !== undefined) {
            // 수익률 계산 (null 체크 추가)
            const calculateReturn = (current, previous) => {
                if (!current || !previous || previous === 0) return 'N/A';
                return ((current - previous) / previous * 100).toFixed(2);
            };
            
            const returns = {
                week: calculateReturn(prices.today, prices.weekAgo),
                month: calculateReturn(prices.today, prices.monthAgo),
                sixMonths: calculateReturn(prices.today, prices.sixMonthsAgo),
                year: calculateReturn(prices.today, prices.yearAgo)
            };
            
            // 수익률에 따른 이모지
            const getEmoji = (returnValue) => {
                if (returnValue === 'N/A') return '❓';
                const val = parseFloat(returnValue);
                if (isNaN(val)) return '❓';
                if (val > 10) return '🚀';
                if (val > 5) return '📈';
                if (val > 0) return '➕';
                if (val === 0) return '➖';
                if (val > -5) return '⬇️';
                if (val > -10) return '📉';
                return '💥';
            };
            
            // 가격 데이터 안전하게 포맷팅
            const formatPrice = (price) => {
                if (price === null || price === undefined) return 'N/A';
                return Math.round(price).toLocaleString();
            };
            
            // 시가총액 계산 (Yahoo Finance에서 제공되는 경우)
            const marketCap = prices.marketCap || "N/A";
            
            content += `
## ${company.companyName}
- **종목코드**: ${company.ticker}
- **시장**: ${company.market === 'KS' ? '코스피' : '코스닥'}
- **현재가**: ${formatPrice(prices.today)}원
- **시가총액**: ${marketCap}
- **주가 변동**:
  - 1주일: ${formatPrice(prices.weekAgo)}원 → ${formatPrice(prices.today)}원 (${returns.week !== 'N/A' && parseFloat(returns.week) > 0 ? '+' : ''}${returns.week}${returns.week !== 'N/A' ? '%' : ''} ${getEmoji(returns.week)})
  - 1개월: ${formatPrice(prices.monthAgo)}원 → ${formatPrice(prices.today)}원 (${returns.month !== 'N/A' && parseFloat(returns.month) > 0 ? '+' : ''}${returns.month}${returns.month !== 'N/A' ? '%' : ''} ${getEmoji(returns.month)})
  - 6개월: ${formatPrice(prices.sixMonthsAgo)}원 → ${formatPrice(prices.today)}원 (${returns.sixMonths !== 'N/A' && parseFloat(returns.sixMonths) > 0 ? '+' : ''}${returns.sixMonths}${returns.sixMonths !== 'N/A' ? '%' : ''} ${getEmoji(returns.sixMonths)})
  - 1년: ${formatPrice(prices.yearAgo)}원 → ${formatPrice(prices.today)}원 (${returns.year !== 'N/A' && parseFloat(returns.year) > 0 ? '+' : ''}${returns.year}${returns.year !== 'N/A' ? '%' : ''} ${getEmoji(returns.year)})
- **분석노트**: [[${company.filePath.replace(VAULT_PATH + '/', '').replace('.md', '')}]]

`;
        } else {
            content += `
## ${company.companyName}
- **종목코드**: ${company.ticker}
- **시장**: ${company.market === 'KS' ? '코스피' : '코스닥'}
- **상태**: ⚠️ 주가 데이터 조회 실패
- **분석노트**: [[${company.filePath.replace(VAULT_PATH + '/', '').replace('.md', '')}]]

`;
        }
    }
    
    // 파일 저장
    const filePath = path.join(SNAPSHOTS_PATH, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`\n✅ 스냅샷 생성 완료: ${fileName}`);
    
    return fileName;
}

// 실행
if (require.main === module) {
    createSnapshot()
        .then(fileName => {
            console.log('스냅샷이 성공적으로 생성되었습니다.');
        })
        .catch(error => {
            console.error('스냅샷 생성 중 오류 발생:', error);
        });
}

module.exports = { createSnapshot };