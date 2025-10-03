/**
 * Render Logger Utility
 *
 * Helps track component renders for performance debugging
 */

interface RenderLogOptions {
  componentName: string;
  props?: Record<string, unknown>;
  showProps?: boolean;
  color?: string;
}

class RenderLogger {
  private static renderCounts = new Map<string, number>();
  private static lastRenderTimes = new Map<string, number>();

  static log(options: RenderLogOptions) {
    const {
      componentName,
      props,
      showProps = false,
      color = "#3b82f6"
    } = options;

    // Update render count
    const currentCount = this.renderCounts.get(componentName) || 0;
    const newCount = currentCount + 1;
    this.renderCounts.set(componentName, newCount);

    // Calculate time since last render
    const now = Date.now();
    const lastTime = this.lastRenderTimes.get(componentName) || now;
    const timeDiff = now - lastTime;
    this.lastRenderTimes.set(componentName, now);

    // Create log message
    const baseMessage = `🔄 ${componentName} - Render #${newCount}`;
    const timeMessage = timeDiff > 0 ? ` (+${timeDiff}ms)` : "";
    const propsMessage =
      showProps && props ? `\nProps: ${JSON.stringify(props, null, 2)}` : "";

    // Log with styling
    console.log(
      `%c${baseMessage}${timeMessage}${propsMessage}`,
      `color: ${color}; font-weight: bold;`
    );

    // Warn about excessive renders
    if (newCount > 10 && timeDiff < 100) {
      console.warn(
        `⚠️ ${componentName} has rendered ${newCount} times rapidly. Check for optimization issues.`
      );
    }
  }

  static reset(componentName?: string) {
    if (componentName) {
      this.renderCounts.delete(componentName);
      this.lastRenderTimes.delete(componentName);
      console.log(`🧹 Reset render stats for ${componentName}`);
    } else {
      this.renderCounts.clear();
      this.lastRenderTimes.clear();
      console.log("🧹 Reset all render stats");
    }
  }

  static getStats(componentName: string) {
    return {
      renderCount: this.renderCounts.get(componentName) || 0,
      lastRenderTime: this.lastRenderTimes.get(componentName) || 0
    };
  }

  static getAllStats() {
    const stats: Record<
      string,
      { renderCount: number; lastRenderTime: number }
    > = {};

    for (const [componentName] of this.renderCounts) {
      stats[componentName] = this.getStats(componentName);
    }

    return stats;
  }
}

/**
 * React Hook for logging renders
 */
export const useRenderLogger = (
  componentName: string,
  props?: Record<string, unknown>
) => {
  RenderLogger.log({ componentName, props, showProps: false });
};

/**
 * React Hook for detailed render logging with props
 */
export const useDetailedRenderLogger = (
  componentName: string,
  props?: Record<string, unknown>
) => {
  RenderLogger.log({ componentName, props, showProps: true });
};

export default RenderLogger;
