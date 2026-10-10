import { describe, expect, it } from 'vitest';
import { escapeHtml } from './mail';

describe('escapeHtml', () => {
  it('escapes characters that could inject HTML', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(escapeHtml(`<a href='x' onclick="y">`)).toBe('&lt;a href=&#39;x&#39; onclick=&quot;y&quot;&gt;');
  });

  it('escapes ampersands first, without double escaping', () => {
    expect(escapeHtml('Tom & Jerry &lt;')).toBe('Tom &amp; Jerry &amp;lt;');
  });

  it('keeps regular text unchanged', () => {
    expect(escapeHtml('Calourada 2026 - Medicina UFBA')).toBe('Calourada 2026 - Medicina UFBA');
  });
});
