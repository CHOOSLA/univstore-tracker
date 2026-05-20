import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import engine from './lib/engine.js';
import filters from './lib/filters.js';

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

  it('isRecoveryMode + 이미지 있는 API 응답은 API 경로로 처리한다', async () => {
    mockCtx.isRecoveryMode = true;
    mockCtx.browserContext.request.get.mockResolvedValue({
      status: () => 200,
      json: async () => ({
        id: 13704,
        brand_name: 'X', front_name: 'Y',
        price1: 100, price2: 90,
        thumbnail_url: 'https://image.univstore.com/x.jpg',
      })
    });
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBe(true);
    expect(mockCtx.itemInfo.imageUrl).toBe('https://image.univstore.com/x.jpg');
  });

  it('isRecoveryMode + 이미지 없는 API 응답은 페이지 fallback으로 위임한다', async () => {
    mockCtx.isRecoveryMode = true;
    mockCtx.browserContext.request.get.mockResolvedValue({
      status: () => 200,
      json: async () => ({
        id: 13704,
        brand_name: 'X', front_name: 'Y',
        price1: 100, price2: 90,
        thumbnail_url: null,
      })
    });
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBeUndefined();
  });

  it('API 응답을 itemInfo로 매핑하고 apiHandled를 set한다', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({
      status: () => 200,
      json: async () => ({
        id: 13704,
        brand_name: '비오엠',
        front_name: '듀이립밤',
        price1: 15000,
        price2: 7700,
        thumbnail_url: 'https://image.univstore.com/x.jpg',
        benefit: '무료배송',
        item_category_name: '뷰티',
        brand_item_category_name: '뷰티',
        has_stock: true,
      })
    });
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBe(true);
    expect(mockCtx.itemInfo.price).toBe('7700');
    expect(mockCtx.itemInfo.originalPrice).toBe('15000');
    expect(mockCtx.itemInfo.brand).toBe('비오엠');
    expect(mockCtx.itemInfo.stockStatus).toBe('In Stock');
  });

  it('403/405/429는 BlockDetectedError를 던진다', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({ status: () => 405 });
    await expect(filter.process(mockCtx)).rejects.toMatchObject({ name: 'BlockDetectedError' });
  });

  it('401은 SessionExpiredError를 던진다', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({ status: () => 401 });
    await expect(filter.process(mockCtx)).rejects.toMatchObject({ name: 'SessionExpiredError' });
  });

  it('기타 4xx는 apiHandled를 set하지 않고 페이지 fallback으로 위임한다', async () => {
    mockCtx.browserContext.request.get.mockResolvedValue({ status: () => 404 });
    await filter.process(mockCtx);
    expect(mockCtx.apiHandled).toBeUndefined();
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
