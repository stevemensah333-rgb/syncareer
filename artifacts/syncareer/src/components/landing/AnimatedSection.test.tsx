import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import AnimatedSection from './AnimatedSection';

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  options: IntersectionObserverInit | undefined;
  observed: Element[] = [];
  disconnected = false;

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  enterView() {
    this.callback([{ isIntersecting: true }]);
  }
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AnimatedSection', () => {
  it('renders children hidden until the section scrolls into view, then reveals once', () => {
    const { container } = render(
      <AnimatedSection y={20}>
        <p>Revealed content</p>
      </AnimatedSection>,
    );
    const section = container.firstChild as HTMLElement;
    expect(screen.getByText('Revealed content')).toBeTruthy();
    expect(section.style.opacity).toBe('0');
    expect(section.style.transform).toBe('translateY(20px)');

    const observer = MockIntersectionObserver.instances[0];
    expect(observer).toBeTruthy();
    expect(observer!.options?.rootMargin).toBe('-40px');

    act(() => observer!.enterView());
    expect(section.style.opacity).toBe('1');
    expect(section.style.transform).toBe('');
    expect(observer!.disconnected).toBe(true);
  });

  it('is immediately visible when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(
      <AnimatedSection>
        <p>Always visible</p>
      </AnimatedSection>,
    );
    const section = container.firstChild as HTMLElement;
    expect(section.style.opacity).toBe('1');
  });
});
