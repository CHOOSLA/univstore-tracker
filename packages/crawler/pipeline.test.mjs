import { describe, it, expect, vi, beforeEach } from 'vitest';
import engine from './lib/engine.js';
import filters from './lib/filters.js';

const { Pipeline, SessionExpiredError } = engine;
const { ExtractionFilter, ValidationFilter, SessionCheckFilter } = filters;

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
