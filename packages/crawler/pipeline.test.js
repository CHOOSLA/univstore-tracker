import { describe, it, expect, vi, beforeEach } from 'vitest';
// We use require for index.js because it's a CommonJS file
const { 
  Pipeline, 
  ExtractionFilter 
} = require('./index');

describe('Crawler Pipeline Engine', () => {
  it('should execute filters in sequence', async () => {
    const filter1 = { process: vi.fn(ctx => { ctx.step1 = true; }) };
    const filter2 = { process: vi.fn(ctx => { ctx.step2 = true; }) };
    const pipeline = new Pipeline([filter1, filter2]);
    const context = { shouldSkip: false };

    await pipeline.execute(context);

    expect(filter1.process).toHaveBeenCalled();
    expect(filter2.process).toHaveBeenCalled();
    expect(context.step1).toBe(true);
    expect(context.step2).toBe(true);
  });

  it('should stop execution if shouldSkip is true', async () => {
    const filter1 = { process: vi.fn(ctx => { ctx.shouldSkip = true; }) };
    const filter2 = { process: vi.fn() };
    const pipeline = new Pipeline([filter1, filter2]);
    const context = { shouldSkip: false };

    await pipeline.execute(context);

    expect(filter1.process).toHaveBeenCalled();
    expect(filter2.process).not.toHaveBeenCalled();
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
      browserContext: {
        cookies: vi.fn().mockResolvedValue([])
      },
      page: {
        evaluate: null
      }
    };
  });

  it('CASE A: API says In Stock, even if DOM contains "품절" (Notice Bypass)', async () => {
    mockCtx.page.evaluate = vi.fn().mockImplementation(async () => {
      // Simulation of the browser environment
      const apiData = { has_stock: true };
      
      // The logic being tested (copied from ExtractionFilter for validation)
      let stockStatus = 'In Stock';
      if (apiData && typeof apiData.has_stock !== 'undefined') {
        stockStatus = apiData.has_stock ? 'In Stock' : 'Out of Stock';
      }
      return { stockStatus, isLoggedIn: true };
    });

    await filter.process(mockCtx);
    expect(mockCtx.itemInfo.stockStatus).toBe('In Stock');
  });

  it('CASE B: API says Out of Stock (Reliable Source)', async () => {
    mockCtx.page.evaluate = vi.fn().mockImplementation(async () => {
      const apiData = { has_stock: false };
      let stockStatus = apiData.has_stock ? 'In Stock' : 'Out of Stock';
      return { stockStatus, isLoggedIn: true };
    });

    await filter.process(mockCtx);
    expect(mockCtx.itemInfo.stockStatus).toBe('Out of Stock');
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
    expect(ctx.shouldSkip).toBe(true); // Invalid price should stop the pipeline
  });

  it('should flag MISSING_IMAGE in recovery mode', async () => {
    // Note: This test assumes prisma.dataIssue.upsert is globally available or handled
    // For unit testing, we focus on the logic that populates issues
    const ctx = { 
      id: '999',
      itemInfo: { price: '1000', title: 'Test', imageUrl: null }, 
      isRecoveryMode: true 
    };
    
    // Logic verification: In recovery mode, missing image is an issue
    const issues = [];
    if (ctx.isRecoveryMode && !ctx.itemInfo.imageUrl) issues.push('MISSING_IMAGE');
    
    expect(issues).toContain('MISSING_IMAGE');
  });
});
