import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import engine from './lib/engine.js';
import filters from './lib/filters.js';
import { BlockGuard } from './lib/blockGuard.js';

const { Pipeline, SessionExpiredError } = engine;
const { ExtractionFilter, ValidationFilter, SessionCheckFilter, DirectApiFilter, NavigationFilter } = filters;

describe('Crawler Pipeline Engine', () => {
  it('should execute filters in sequence', async () => {
    const filter1 = { process: vi.fn(async (ctx) => { ctx.step1 = true; }) };
    const filter2 = { process: vi.fn(async (ctx) => { ctx.step2 = true; }) };
    const pipeline = new Pipeline([filter1, filter2]);
    const context = { shouldSkip: false };

    await pipeline.execute(context);

    expect(filter1.process).toHaveBeenCalled();
    expect(filter2.process).toHaveBeenCalled();
    expect(context.step1).toBe(true);
    expect(context.step2).toBe(true);
  });

  it('should stop execution if shouldSkip is true', async () => {
    const filter1 = { process: vi.fn(async (ctx) => { ctx.shouldSkip = true; }) };
    const filter2 = { process: vi.fn() };
    const pipeline = new Pipeline([filter1, filter2]);
    const context = { shouldSkip: false };

    await pipeline.execute(context);

    expect(filter1.process).toHaveBeenCalled();
    expect(filter2.process).not.toHaveBeenCalled();
  });
});

describe('SessionCheckFilter', () => {
  let filter;
  let mockCtx;

  beforeEach(() => {
    filter = new SessionCheckFilter();
    mockCtx = {
      page: {
        evaluate: null
      }
    };
  });

  it('should throw SessionExpiredError if not logged in', async () => {
    mockCtx.page.evaluate = vi.fn().mockResolvedValue(false);
    try {
      await filter.process(mockCtx);
      expect.fail('Should have thrown SessionExpiredError');
    } catch (err) {
      expect(err.name).toBe('SessionExpiredError');
    }
  });

  it('should pass if logged in', async () => {
    mockCtx.page.evaluate = vi.fn().mockResolvedValue(true);
    await expect(filter.process(mockCtx)).resolves.not.toThrow();
  });
});

describe('ExtractionFilter - Stock Logic Validation', () => {
  let filter;
  let mockCtx;

  beforeEach(() => {
    filter = new ExtractionFilter();
    mockCtx = {
      id: '123',
      isRecoveryMode: false,
      page: {
        evaluate: null,
        content: vi.fn().mockResolvedValue('<html></html>')
      }
    };
  });

  it('CASE A: API says In Stock', async () => {
    mockCtx.page.evaluate = vi.fn().mockImplementation(async () => {
      return { price: '1000', stockStatus: 'In Stock' };
    });

    await filter.process(mockCtx);
    expect(mockCtx.itemInfo.stockStatus).toBe('In Stock');
  });

  it('CASE B: API says Out of Stock', async () => {
    mockCtx.page.evaluate = vi.fn().mockImplementation(async () => {
      return { price: '1000', stockStatus: 'Out of Stock' };
    });

    await filter.process(mockCtx);
    expect(mockCtx.itemInfo.stockStatus).toBe('Out of Stock');
  });
});

describe('DirectApiFilter', () => {
  let filter;
  let mockCtx;
  const originalEnv = process.env.USE_DIRECT_API;

  beforeEach(() => {
    filter = new DirectApiFilter();
    mockCtx = {
      id: '13704',
      isRecoveryMode: false,
      browserContext: {
        request: {
          get: vi.fn()
        }
      }
    };
    process.env.USE_DIRECT_API = 'true';
  });

  afterEach(() => {
    process.env.USE_DIRECT_API = originalEnv;
  });

  it('flag가 꺼져 있으면 아무 동작도 하지 않는다', async () => {
    process.env.USE_DIRECT_API = 'false';
    await filter.process(mockCtx);
    expect(mockCtx.browserContext.request.get).not.toHaveBeenCalled();
    expect(mockCtx.apiHandled).toBeUndefined();
  });

  // 신 API 응답 래퍼: { statusCode:'SUCCESS', result:{ item, paymentDiscountList } }
  const mockNewApi = (status, item, paymentDiscountList = []) => ({
    status: () => status,
    json: async () => ({ statusCode: 'SUCCESS', result: { item, paymentDiscountList } }),
  });

  it('isRecoveryMode + 이미지 있는 API 응답은 API 경로로 처리한다', async () => {
    mockCtx.isRecoveryMode = true;
    mockCtx.browserContext.request.get.mockResolvedValue(mockNewApi(200, {
      id: 13704, brandName: 'X', frontName: 'Y', price1: 100, discountRate: 0,
      thumbnailUrl: 'https://image.univstore.com/x.jpg', hasStock: true,
    }));
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBe(true);
    expect(mockCtx.itemInfo.imageUrl).toBe('https://image.univstore.com/x.jpg');
  });

  it('isRecoveryMode + 이미지 없는 API 응답은 페이지 fallback으로 위임한다', async () => {
    mockCtx.isRecoveryMode = true;
    mockCtx.browserContext.request.get.mockResolvedValue(mockNewApi(200, {
      id: 13704, brandName: 'X', frontName: 'Y', price1: 100, discountRate: 0,
      thumbnailUrl: null, hasStock: true,
    }));
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBeUndefined();
  });

  it('API 응답을 itemInfo로 매핑하고 apiHandled를 set한다 (할인율 역산 포함)', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue(mockNewApi(200, {
      id: 13704, brandName: '비오엠', frontName: '듀이립밤',
      price1: 7700, discountRate: 23, // 정가 역산: 7700/(1-0.23)=10000
      thumbnailUrl: 'https://image.univstore.com/x.jpg',
      categoryName: '뷰티', brandItemCategoryName: '뷰티', hasStock: true,
    }, [{ cartTabName: '카카오페이머니 할인' }]));
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBe(true);
    expect(mockCtx.itemInfo.price).toBe('7700');
    expect(mockCtx.itemInfo.originalPrice).toBe('10000');
    expect(mockCtx.itemInfo.brand).toBe('비오엠');
    expect(mockCtx.itemInfo.stockStatus).toBe('In Stock');
    expect(mockCtx.itemInfo.bestBenefit).toBe('카카오페이머니 할인');
  });

  it('ITEM_NOT_FOUND는 단종 상품으로 마킹하고 shouldSkip', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({
      status: () => 400,
      json: async () => ({ statusCode: 'FAIL', errorCode: 'ITEM_NOT_FOUND', result: '' }),
    });
    await filter.process(mockCtx);
    expect(mockCtx.shouldSkip).toBe(true);
    expect(mockCtx.apiHandled).toBeUndefined();
  });

  it('403/405/429는 BlockDetectedError를 던진다', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({ status: () => 405 });
    await expect(filter.process(mockCtx)).rejects.toMatchObject({ name: 'BlockDetectedError' });
  });

  it('SUCCESS가 아닌 기타 응답은 apiHandled를 set하지 않고 페이지 fallback으로 위임한다', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({
      status: () => 500,
      json: async () => ({ statusCode: 'FAIL', result: '' }),
    });
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBeUndefined();
  });
});

describe('BlockGuard', () => {
  const originalEnv = process.env.USE_DIRECT_API;

  beforeEach(() => { process.env.USE_DIRECT_API = 'true'; });
  afterEach(() => { process.env.USE_DIRECT_API = originalEnv; });

  it('임계값 미만의 차단은 NOTED 상태로 유지된다', () => {
    const g = new BlockGuard({ threshold: 3, windowMs: 60000, recoveryMs: 60000 });
    expect(g.recordBlock(1000).action).toBe('NOTED');
    expect(g.recordBlock(2000).action).toBe('NOTED');
    expect(g.isDirectApiActive()).toBe(true);
  });

  it('임계값 도달 시 DISABLED로 전환된다', () => {
    const g = new BlockGuard({ threshold: 3, windowMs: 60000, recoveryMs: 60000 });
    g.recordBlock(1000);
    g.recordBlock(2000);
    const r = g.recordBlock(3000);
    expect(r.action).toBe('DISABLED');
    expect(g.isDirectApiActive()).toBe(false);
  });

  it('윈도우 밖의 과거 차단은 카운트에서 제거된다', () => {
    const g = new BlockGuard({ threshold: 3, windowMs: 60000, recoveryMs: 60000 });
    g.recordBlock(1000);
    g.recordBlock(2000);
    // 윈도우(60s) 초과 후 새 차단 → 과거 2건은 cleanup 대상
    const r = g.recordBlock(70_000);
    expect(r.count).toBe(1);
    expect(r.action).toBe('NOTED');
  });

  it('recoveryMs 후 차단 없으면 자동 복귀한다', () => {
    const g = new BlockGuard({ threshold: 2, windowMs: 30000, recoveryMs: 60000 });
    g.recordBlock(1000);
    g.recordBlock(2000);  // DISABLED
    expect(g.isDirectApiActive()).toBe(false);

    // recoveryMs 경과 + 윈도우 밖이므로 카운트도 사라짐
    const recovered = g.maybeRecover(100_000);
    expect(recovered).toBe(true);
    expect(g.isDirectApiActive()).toBe(true);
  });

  it('USE_DIRECT_API=false면 disabled 여부와 무관하게 비활성', () => {
    process.env.USE_DIRECT_API = 'false';
    const g = new BlockGuard();
    expect(g.isDirectApiActive()).toBe(false);
  });
});

describe('NavigationFilter - apiHandled 가드', () => {
  it('ctx.apiHandled가 true면 page.goto를 호출하지 않는다', async () => {
    const filter = new NavigationFilter();
    const mockCtx = {
      id: '123',
      apiHandled: true,
      page: { goto: vi.fn() }
    };
    await filter.process(mockCtx);
    expect(mockCtx.page.goto).not.toHaveBeenCalled();
  });
});

describe('ValidationFilter - Data Quality Logic', () => {
  let filter;
  beforeEach(() => { filter = new ValidationFilter(); });

  it('should flag INVALID_PRICE if price is 0 or NaN', async () => {
    const ctx = { 
      itemInfo: { price: '0', title: 'Test' }, 
      isRecoveryMode: false,
      shouldSkip: false 
    };
    await filter.process(ctx);
    expect(ctx.shouldSkip).toBe(true);
  });
});
